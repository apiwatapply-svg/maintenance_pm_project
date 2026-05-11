const prisma = require('../prismaClient');

// [FIX] Helper function to check if a detail should be considered NG
// Skips "ghost items" - NUMERIC details with no value
const isDetailNG = (detail, masterChecklist = null) => {
    // If isPass is true, it's not NG
    if (detail.isPass) return false;

    // Get type from masterChecklist or detail itself
    const type = (masterChecklist?.type || detail.masterChecklist?.type || '').toUpperCase();

    // For NUMERIC type: skip if value is empty (not filled in = ghost item)
    if (type === 'NUMERIC' && (!detail.value || detail.value.toString().trim() === '')) {
        return false;
    }

    // For other types or NUMERIC with value, check isPass
    return !detail.isPass;
};

// Get PM Schedule/Records for Calendar
exports.getSchedule = async (req, res) => {
    try {
        const { month, year } = req.query;
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59, 999);

        // [PERF] Use req.assignedMachineIds from RBAC middleware
        const assignedMachineIds = req.assignedMachineIds;

        // [PERF] Step 1: Load records WITHOUT details (lightweight)
        const records = await prisma.pMRecord.findMany({
            where: {
                date: {
                    gte: startDate,
                    lte: endDate
                },
                ...(assignedMachineIds ? { machineId: { in: assignedMachineIds } } : {})
            },
            include: {
                machine: {
                    include: {
                        machineMaster: true
                    }
                },
                preventiveType: true
                // ❌ No details — saves ~80% payload
            },
            orderBy: { date: 'desc' }
        });

        // [PERF] Step 2: Batch check NG status (1 query for all records)
        const recordIds = records.map(r => r.id);
        let ngSet = new Set();
        if (recordIds.length > 0) {
            const ngDetails = await prisma.pMRecordDetail.findMany({
                where: {
                    recordId: { in: recordIds },
                    isPass: false
                },
                select: {
                    recordId: true,
                    value: true,
                    masterChecklist: { select: { type: true } }
                }
            });

            ngDetails.forEach(d => {
                const type = (d.masterChecklist?.type || '').toUpperCase();
                // Filter ghost items (NUMERIC with no value)
                if (type === 'NUMERIC' && (!d.value || d.value.toString().trim() === '' || d.value === 'null')) {
                    return; // Skip ghost item
                }
                ngSet.add(d.recordId);
            });
        }

        // Get all machines with their PM plans
        const machines = await prisma.machine.findMany({
            where: {
                ...(assignedMachineIds ? { id: { in: assignedMachineIds } } : {})
            },
            include: {
                pmPlans: {
                    include: {
                        preventiveType: true
                    }
                },
                machineMaster: true
            }
        });

        // Build calendar events
        const events = [];

        // Add completed PM records
        records.forEach(record => {
            // [PERF] Use pre-computed NG set instead of scanning details
            const lastCheckStatus = ngSet.has(record.id) ? 'HAS_NG' : 'ALL_OK';

            events.push({
                id: `record-${record.id}`,
                type: 'completed',
                date: record.date,
                machine: {
                    id: record.machine.id,
                    name: record.machine.name,
                    code: record.machine.code
                },
                preventiveType: record.preventiveType ? { name: record.preventiveType.name } : null,
                status: record.status,
                lastCheckStatus,
                inspector: record.inspector,
                checker: record.checker
            });
        });

        // Add upcoming scheduled PMs from Plans
        const today = new Date();
        machines.forEach(machine => {
            if (machine.pmPlans) {
                machine.pmPlans.forEach(plan => {
                    if (plan.nextPMDate) {
                        const nextDate = new Date(plan.nextPMDate);
                        const diffDays = Math.ceil((nextDate - today) / (1000 * 60 * 60 * 24));

                        let eventType = 'scheduled';
                        if (diffDays < 0) {
                            eventType = 'overdue';
                        } else if (diffDays <= plan.advanceNotifyDays) {
                            eventType = 'upcoming';
                        }

                        // Check if this scheduled event is in the requested month
                        const eventDate = new Date(plan.nextPMDate);
                        if (eventDate.getMonth() === parseInt(month) - 1 && eventDate.getFullYear() === parseInt(year)) {
                            events.push({
                                id: `schedule-${machine.id}-${plan.preventiveTypeId}`,
                                type: eventType,
                                date: plan.nextPMDate,
                                machine: {
                                    id: machine.id,
                                    name: machine.name,
                                    code: machine.code
                                },
                                preventiveType: plan.preventiveType ? { name: plan.preventiveType.name } : null,
                                daysUntil: diffDays,
                                frequencyDays: plan.frequencyDays
                            });
                        }
                    }
                });
            }
        });

        res.json(events);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Create PM Record
exports.recordPM = async (req, res) => {
    try {
        const { machineId, inspector, checker, status, remark, details, preventiveTypeId } = req.body;

        // [NEW] Combine standard details with subItemDetails FIRST
        const allDetails = [...details];

        // [NEW] Convert subItemDetails object to array format
        console.log('[DEBUG] subItemDetails received:', JSON.stringify(req.body.subItemDetails, null, 2));
        if (req.body.subItemDetails) {
            const subItemDetailsObj = req.body.subItemDetails;
            for (const key in subItemDetailsObj) {
                const sub = subItemDetailsObj[key];
                if (sub.checklistId && sub.subItemName !== undefined) {
                    allDetails.push({
                        checklistId: sub.checklistId,
                        topic: `${sub.topic || ''} : ${sub.subItemName}`,
                        isPass: sub.isPass || false,
                        value: sub.value || null,
                        remark: sub.remark || null,
                        subItemName: sub.subItemName
                    });
                }
            }
        }

        // [NEW] Rate Limit Check (Optimized - Batch Query)
        if (allDetails && allDetails.length > 0) {
            // 1. Filter details that have values
            const detailsWithValue = allDetails.filter(d => d.value);

            if (detailsWithValue.length > 0) {
                // 2. Get all unique checklist IDs
                const checklistIds = [...new Set(detailsWithValue.map(d => d.checklistId))];

                // 3. Batch fetch MasterChecklists that have limits enabled
                const masters = await prisma.masterChecklist.findMany({
                    where: {
                        id: { in: checklistIds },
                        useValueLimit: true
                    }
                });

                if (masters.length > 0) {
                    // 4. Prepare for batch history fetch
                    const masterMap = new Map(masters.map(m => [m.id, m]));
                    const limitedChecklistIds = masters.map(m => m.id);

                    // Find the maximum lookback time needed
                    const maxHours = Math.max(...masters.map(m => m.valueLimitHours));
                    const globalStartTime = new Date();
                    globalStartTime.setHours(globalStartTime.getHours() - maxHours);

                    // 5. Batch fetch relevant history
                    // We fetch ALL details for these checklists within the max time window
                    // This avoids N queries inside the loop
                    const history = await prisma.pMRecordDetail.findMany({
                        where: {
                            checklistId: { in: limitedChecklistIds },
                            record: {
                                date: { gte: globalStartTime }
                            }
                        },
                        select: {
                            checklistId: true,
                            value: true,
                            record: {
                                select: { date: true }
                            }
                        }
                    });

                    // 6. Validate each detail in memory
                    for (const d of detailsWithValue) {
                        const master = masterMap.get(d.checklistId);
                        if (!master) continue;

                        const limitCount = master.valueLimitCount;
                        const limitHours = master.valueLimitHours;

                        // Calculate specific start time for this master
                        const startTime = new Date();
                        startTime.setHours(startTime.getHours() - limitHours);

                        // Count usage from fetched history
                        const usageCount = history.filter(h =>
                            h.checklistId === d.checklistId &&
                            h.value === d.value &&
                            new Date(h.record.date) >= startTime
                        ).length;

                        if (usageCount >= limitCount) {
                            return res.status(400).json({
                                error: `ค่า '${d.value}' สำหรับ '${master.topic}' เกินขีดจำกัดการใช้งาน (${limitCount} ครั้ง ใน ${limitHours} ชั่วโมง)`
                            });
                        }
                    }
                }
            }
        }

        // Create record with nested details
        // allDetails is already populated directly above the Rate Limiter

        // [NEW] Get dueDate from plan before creating record
        let dueDate = null;
        if (preventiveTypeId) {
            const planForDueDate = await prisma.machinePMPlan.findUnique({
                where: {
                    machineId_preventiveTypeId: {
                        machineId: parseInt(machineId),
                        preventiveTypeId: parseInt(preventiveTypeId)
                    }
                }
            });
            if (planForDueDate && planForDueDate.nextPMDate) {
                dueDate = planForDueDate.nextPMDate;
            }
        }

        const record = await prisma.pMRecord.create({
            data: {
                machineId: parseInt(machineId),
                inspector,
                checker,
                status,
                remark,
                preventiveTypeId: preventiveTypeId ? parseInt(preventiveTypeId) : null,
                dueDate: dueDate, // [NEW] Save original due date
                details: {
                    create: allDetails.map(d => ({
                        checklistId: d.checklistId,
                        topic: d.topic,
                        isPass: d.isPass,
                        value: d.value,
                        remark: d.remark,
                        image: d.image,
                        imageBefore: d.imageBefore,
                        imageAfter: d.imageAfter,
                        subItemName: d.subItemName || null // [NEW] Save sub-item name
                    }))
                }
            },
            include: { details: true }
        });

        // Update specific plan's dates
        if (preventiveTypeId) {
            const plan = await prisma.machinePMPlan.findUnique({
                where: {
                    machineId_preventiveTypeId: {
                        machineId: parseInt(machineId),
                        preventiveTypeId: parseInt(preventiveTypeId)
                    }
                }
            });

            if (plan) {
                const updateData = {
                    lastPMDate: new Date()
                };

                // [NEW] Update lastCheckStatus
                // Fetch MasterChecklists to reliably determine type for each detail
                const checklistIds = [...new Set(allDetails.map(d => d.checklistId))];
                const masters = await prisma.masterChecklist.findMany({
                    where: { id: { in: checklistIds } },
                    select: { id: true, type: true }
                });
                const typeMap = new Map(masters.map(m => [m.id, m.type]));

                // [FIX] Use helper to skip ghost items
                const hasNG = allDetails.some(d => {
                    const type = typeMap.get(d.checklistId);
                    return isDetailNG(d, { type });
                });
                updateData.lastCheckStatus = hasNG ? 'HAS_NG' : 'ALL_OK';

                if (plan.frequencyDays > 0) {
                    // Fetch Preventive Type to check scheduling mode
                    const pmType = await prisma.preventiveType.findUnique({
                        where: { id: parseInt(preventiveTypeId) }
                    });

                    const isFixedDate = pmType ? pmType.isFixedDate : true; // Default to Fixed
                    const postponeLogic = pmType ? pmType.postponeLogic : 'SHIFT'; // [NEW] Default to SHIFT

                    let baseDate;
                    if (isFixedDate) {
                        if (postponeLogic === 'MAINTAIN_CYCLE') {
                            // MAINTAIN_CYCLE: Use current Target Date (Due Date) to keep original cadence
                            // This ensures the schedule stays rigid even if PM is done early/late
                            // Also respects manual reschedules by admin
                            baseDate = plan.nextPMDate ? new Date(plan.nextPMDate) : new Date();
                        } else {
                            // SHIFT: Use the actual PM completion date
                            // This shifts the entire future schedule based on when PM was actually done
                            baseDate = new Date();
                        }
                    } else {
                        // Floating: Use Actual Completion Date (Today)
                        baseDate = new Date();
                    }

                    const nextDate = new Date(baseDate);
                    nextDate.setDate(nextDate.getDate() + plan.frequencyDays);
                    updateData.nextPMDate = nextDate;
                } else {
                    // Manual Mode: No next schedule
                    updateData.nextPMDate = null;
                }

                await prisma.machinePMPlan.update({
                    where: { id: plan.id },
                    data: updateData
                });
            }
        } else {
            // Fallback for legacy (if no type provided), maybe try to update FIRST plan found?
            // Or leave as is.
            // If we migrated everything, we should enforce preventiveTypeId.
        }

        if (req.io) {
            req.io.emit('pm_update', { action: 'create', recordId: record.id, machineId });
            req.io.emit('dashboard_update');
        }

        res.json(record);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.deleteRecord = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.pMRecord.delete({ where: { id: parseInt(id) } });

        if (req.io) {
            req.io.emit('pm_update', { action: 'delete', recordId: id });
            req.io.emit('dashboard_update');
        }

        res.json({ message: 'Deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get single PM Record by ID
exports.getRecord = async (req, res) => {
    try {
        const { id } = req.params;

        const record = await prisma.pMRecord.findUnique({
            where: { id: parseInt(id) },
            include: {
                machine: {
                    include: {
                        machineMaster: {
                            include: {
                                machineType: {
                                    include: {
                                        area: true
                                    }
                                }
                            }
                        },
                        pmPlans: {
                            include: {
                                preventiveType: {
                                    include: {
                                        masterChecklists: {
                                            orderBy: { order: 'asc' }
                                        }
                                    }
                                }
                            }
                        },
                    }
                },
                preventiveType: {
                    include: {
                        masterChecklists: {
                            orderBy: { order: 'asc' }
                        }
                    }
                },
                details: {
                    include: {
                        masterChecklist: true
                    }
                }
            }
        });

        if (!record) {
            return res.status(404).json({ error: 'PM Record not found' });
        }

        res.json(record);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get Dashboard Statistics
exports.getDashboardStats = async (req, res) => {
    try {
        const today = new Date();

        // [PERF] Use req.assignedMachineIds from RBAC middleware
        const assignedMachineIds = req.assignedMachineIds;

        const allMachines = await prisma.machine.findMany({
            where: {
                ...(assignedMachineIds ? { id: { in: assignedMachineIds } } : {})
            },
            include: {
                pmPlans: true
            }
        });

        const totalMachines = allMachines.length;
        let completed = 0;
        let upcoming = 0;
        let overdue = 0;

        allMachines.forEach(machine => {
            if (machine.pmPlans) {
                // Determine machine "worst" status
                let isOverdue = false;
                let isUpcoming = false;
                let hasPlan = false;

                machine.pmPlans.forEach(plan => {
                    if (plan.nextPMDate) {
                        hasPlan = true;
                        const nextDate = new Date(plan.nextPMDate);
                        const diffDays = Math.ceil((nextDate - today) / (1000 * 60 * 60 * 24));

                        if (diffDays < 0) isOverdue = true;
                        else if (diffDays <= plan.advanceNotifyDays) isUpcoming = true;
                    }
                });

                if (isOverdue) overdue++;
                else if (isUpcoming) upcoming++;
                else if (hasPlan) completed++; // Has plan and not due/overdue
                // If no plan, doesn't count towards these stats? Or counts as completed?
                // Logic: "Completed" usually means "Up to date".
                // If has no plans, it's neutral.
            }
        });

        res.json({
            totalMachines,
            completed,
            upcoming,
            overdue
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get PM History for specific machine (with server-side pagination)
exports.getMachineHistory = async (req, res) => {
    try {
        const { machineId } = req.params;
        const { year, page = 1, limit = 10, pmTypeId, area, type } = req.query;

        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 10;
        const skip = (pageNum - 1) * limitNum;

        const where = {};

        // [PERF] Use req.assignedMachineIds from RBAC middleware
        const assignedMachineIds = req.assignedMachineIds;
        if (assignedMachineIds) {
            if (machineId && machineId !== 'all') {
                if (!assignedMachineIds.includes(parseInt(machineId))) {
                    return res.status(403).json({ error: 'Access denied to this machine' });
                }
            } else {
                where.machineId = { in: assignedMachineIds };
            }
        }

        // Handle "all" machineId (if not already handled by RBAC)
        if (machineId && machineId !== 'all') {
            where.machineId = parseInt(machineId);
        }

        // [NEW] Filter by Area and Machine Type (Nested Relations)
        if (area || type) {
            where.machine = {
                machineMaster: {
                    machineType: {
                        ...(type ? { name: type } : {}),
                        ...(area ? { area: { name: area } } : {})
                    }
                }
            };
        }

        // Filter by year if provided
        if (year) {
            where.date = {
                gte: new Date(`${year}-01-01`),
                lte: new Date(`${year}-12-31T23:59:59`)
            };
        }

        // Filter by PM Type if provided
        if (pmTypeId && pmTypeId !== 'all') {
            where.preventiveTypeId = parseInt(pmTypeId);
        }

        // Get total count for pagination
        const total = await prisma.pMRecord.count({ where });

        // Get paginated records
        const records = await prisma.pMRecord.findMany({
            where,
            include: {
                machine: true, // Machine now only has pmPlans, not direct preventiveType
                preventiveType: { // Fetch directly from the record
                    include: {
                        masterChecklists: true
                    }
                },
                details: {
                    include: {
                        masterChecklist: true
                    }
                }
            },
            orderBy: {
                date: 'desc'
            },
            skip,
            take: limitNum
        });

        // Return paginated response with metadata
        res.json({
            data: records,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Update PM Record
exports.updateRecord = async (req, res) => {
    try {
        const { id } = req.params;
        const { inspector, checker, status, remark, details, subItemDetails, date } = req.body;

        // [RBAC] Verify access to record's machine
        if (req.assignedMachineIds) {
            const record = await prisma.pMRecord.findUnique({
                where: { id: parseInt(id) },
                select: { machineId: true }
            });

            if (!record) return res.status(404).json({ error: 'Record not found' });

            if (!req.assignedMachineIds.includes(record.machineId)) {
                return res.status(403).json({ error: 'Access denied' });
            }
        }

        // Update record
        const record = await prisma.pMRecord.update({
            where: { id: parseInt(id) },
            data: {
                inspector,
                checker,
                status,
                remark,
                ...(date ? { date: new Date(date) } : {})
            },
            select: {
                id: true,
                machineId: true,
                preventiveTypeId: true,
                inspector: true,
                checker: true,
                status: true,
                remark: true
            }
        });

        // [FIX] Combine standard details with subItemDetails (same as recordPM)
        const allDetails = [...details];

        if (subItemDetails) {
            console.log('[DEBUG] updateRecord subItemDetails received:', JSON.stringify(subItemDetails, null, 2));
            for (const key in subItemDetails) {
                const sub = subItemDetails[key];
                if (sub.checklistId && sub.subItemName !== undefined) {
                    allDetails.push({
                        checklistId: sub.checklistId,
                        topic: `${sub.topic || ''} : ${sub.subItemName}`,
                        isPass: sub.isPass || false,
                        value: sub.value || null,
                        remark: sub.remark || null,
                        subItemName: sub.subItemName
                    });
                }
            }
        }

        // Delete old details and create new ones
        await prisma.pMRecordDetail.deleteMany({
            where: { recordId: parseInt(id) }
        });

        await prisma.pMRecordDetail.createMany({
            data: allDetails.map(d => ({
                recordId: parseInt(id),
                checklistId: d.checklistId,
                topic: d.topic || null,
                isPass: d.isPass,
                value: d.value || null,
                remark: d.remark || null,
                image: d.image || null,
                imageBefore: d.imageBefore || null,
                imageAfter: d.imageAfter || null,
                subItemName: d.subItemName || null
            }))
        });

        // [FIX] Update MachinePMPlan.lastCheckStatus to sync with Dashboard
        const checklistIds = [...new Set(allDetails.map(d => d.checklistId))];
        const masters = await prisma.masterChecklist.findMany({
            where: { id: { in: checklistIds } },
            select: { id: true, type: true }
        });
        const typeMap = new Map(masters.map(m => [m.id, m.type]));

        // [FIX] Use helper to skip ghost items
        const hasNG = allDetails.some(d => {
            const type = typeMap.get(d.checklistId);
            return isDetailNG(d, { type });
        });
        const newLastCheckStatus = hasNG ? 'HAS_NG' : 'ALL_OK';

        // Find and update the PM Plan for this machine and preventive type
        if (record.preventiveTypeId) {
            await prisma.machinePMPlan.updateMany({
                where: {
                    machineId: record.machineId,
                    preventiveTypeId: record.preventiveTypeId
                },
                data: {
                    lastCheckStatus: newLastCheckStatus
                }
            });
        }

        if (req.io) {
            req.io.emit('pm_update', { action: 'update', recordId: id, machineId: record.machineId });
            req.io.emit('dashboard_update');
        }

        res.json({ message: 'Record updated successfully', record });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


// Machine Analysis
exports.getMachineAnalysis = async (req, res) => {
    try {
        const { year } = req.query;
        const where = {};

        // [PERF] Use req.assignedMachineIds from RBAC middleware
        if (req.assignedMachineIds) {
            where.machineId = { in: req.assignedMachineIds };
        }

        if (year) {
            where.date = {
                gte: new Date(`${year}-01-01`),
                lte: new Date(`${year}-12-31T23:59:59`)
            };
        }

        const records = await prisma.pMRecord.findMany({
            where,
            include: {
                machine: { select: { id: true, name: true } },
                details: { select: { isPass: true, topic: true } }
            }
        });

        // 1. PM Status Overview
        const pmStatus = {
            COMPLETED: 0,
            LATE: 0
        };

        // 2. Top Problematic Machines
        const machineProblems = {};

        // 3. Common Failure Topics
        const failureTopics = {};

        records.forEach(record => {
            // Count Status
            if (pmStatus[record.status] !== undefined) {
                pmStatus[record.status]++;
            }

            // Count Problems
            record.details.forEach(detail => {
                if (!detail.isPass) {
                    // Machine Problem
                    const machineName = record.machine.name;
                    machineProblems[machineName] = (machineProblems[machineName] || 0) + 1;

                    // Failure Topic
                    const topic = detail.topic || (detail.masterChecklist ? detail.masterChecklist.topic : "Unknown Topic");
                    failureTopics[topic] = (failureTopics[topic] || 0) + 1;
                }
            });
        });

        // Format for Charts
        const pmStatusData = Object.keys(pmStatus).map(key => ({
            name: key,
            value: pmStatus[key]
        }));

        const problematicMachinesData = Object.keys(machineProblems)
            .map(key => ({ name: key, problems: machineProblems[key] }))
            .sort((a, b) => b.problems - a.problems)
            .slice(0, 5);

        const failureTopicsData = Object.keys(failureTopics)
            .map(key => ({ name: key, count: failureTopics[key] }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        res.json({
            pmStatus: pmStatusData,
            problematicMachines: problematicMachinesData,
            failureTopics: failureTopicsData
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Operator Analysis
exports.getOperatorAnalysis = async (req, res) => {
    try {
        const { year } = req.query;
        const where = {};

        // [PERF] Use req.assignedMachineIds from RBAC middleware
        if (req.assignedMachineIds) {
            where.machineId = { in: req.assignedMachineIds };
        }

        if (year) {
            where.date = {
                gte: new Date(`${year}-01-01`),
                lte: new Date(`${year}-12-31T23:59:59`)
            };
        }

        const records = await prisma.pMRecord.findMany({
            where,
            include: {
                details: { select: { isPass: true } }
            }
        });

        // 1. Workload
        const workload = {};

        // 2. On-Time Performance
        const performance = {};

        // 3. Defect Detection
        const defects = {};

        records.forEach(record => {
            // Inspector Workload
            if (record.inspector) {
                workload[record.inspector] = (workload[record.inspector] || 0) + 1;

                // Performance
                if (!performance[record.inspector]) {
                    performance[record.inspector] = { onTime: 0, late: 0 };
                }
                if (record.status === 'LATE') {
                    performance[record.inspector].late++;
                } else {
                    performance[record.inspector].onTime++;
                }

                // Defects
                const defectCount = record.details.filter(d => !d.isPass).length;
                defects[record.inspector] = (defects[record.inspector] || 0) + defectCount;
            }
        });

        // Format for Charts
        const workloadData = Object.keys(workload)
            .map(key => ({ name: key, tasks: workload[key] }))
            .sort((a, b) => b.tasks - a.tasks);

        const performanceData = Object.keys(performance)
            .map(key => ({
                name: key,
                onTime: performance[key].onTime,
                late: performance[key].late
            }));

        const defectsData = Object.keys(defects)
            .map(key => ({ name: key, defects: defects[key] }))
            .sort((a, b) => b.defects - a.defects);

        res.json({
            workload: workloadData,
            performance: performanceData,
            defects: defectsData
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get Machine Status Overview for Overall Page
exports.getMachineStatusOverview = async (req, res) => {
    try {
        const today = new Date();

        // [PERF] Use req.assignedMachineIds from RBAC middleware
        const assignedMachineIds = req.assignedMachineIds;

        // [PERF] Step 1: Load machines WITHOUT pmrecords (lightweight)
        const machines = await prisma.machine.findMany({
            where: {
                ...(assignedMachineIds ? { id: { in: assignedMachineIds } } : {})
            },
            include: {
                pmPlans: {
                    include: {
                        preventiveType: true
                    }
                },
                machineMaster: {
                    include: {
                        machineType: {
                            include: {
                                area: true
                            }
                        }
                    }
                }
                // ❌ No pmrecords — was 20 records × N details × masterChecklist per machine
            }
        });

        // [PERF] Step 2: Get latest record per (machine, preventiveType) pair
        const machineIds = machines.map(m => m.id);
        let latestRecords = [];
        if (machineIds.length > 0) {
            latestRecords = await prisma.pMRecord.findMany({
                where: {
                    machineId: { in: machineIds },
                    status: { in: ['COMPLETED', 'LATE'] }
                },
                distinct: ['machineId', 'preventiveTypeId'],
                orderBy: { date: 'desc' },
                select: { id: true, machineId: true, preventiveTypeId: true }
            });
        }

        // [PERF] Step 3: Batch check NG (filter ghost items)
        const latestRecordIds = latestRecords.map(r => r.id);
        let ngSet = new Set();
        if (latestRecordIds.length > 0) {
            const ngDetails = await prisma.pMRecordDetail.findMany({
                where: {
                    recordId: { in: latestRecordIds },
                    isPass: false
                },
                select: {
                    recordId: true,
                    value: true,
                    masterChecklist: { select: { type: true } }
                }
            });

            ngDetails.forEach(d => {
                const type = (d.masterChecklist?.type || '').toUpperCase();
                // Filter ghost items (NUMERIC with no value)
                if (type === 'NUMERIC' && (!d.value || d.value.toString().trim() === '' || d.value === 'null')) {
                    return; // Skip ghost item
                }
                ngSet.add(d.recordId);
            });
        }

        // Build lookup: machineId → Set of NG preventiveTypeIds
        const ngLookup = new Map();
        const recordLookup = new Map();
        latestRecords.forEach(r => {
            recordLookup.set(`${r.machineId}-${r.preventiveTypeId}`, true);
            if (ngSet.has(r.id)) {
                if (!ngLookup.has(r.machineId)) ngLookup.set(r.machineId, new Set());
                ngLookup.get(r.machineId).add(r.preventiveTypeId);
            }
        });

        const statusList = machines.map(machine => {
            let worstStatus = 'NO_SCHEDULE';
            let minDaysUntil = 9999;
            let targetNextDate = null;
            let targetTypeName = 'None';
            let lastCheckStatus = null;

            // [PERF] Use pre-computed lookup
            let anyNG = false;
            let anyRecord = false;

            if (machine.pmPlans && machine.pmPlans.length > 0) {
                machine.pmPlans.forEach(plan => {
                    const key = `${machine.id}-${plan.preventiveTypeId}`;
                    if (recordLookup.has(key)) {
                        anyRecord = true;
                        if (ngLookup.has(machine.id) && ngLookup.get(machine.id).has(plan.preventiveTypeId)) {
                            anyNG = true;
                        }
                    }
                });
            }

            if (anyNG) lastCheckStatus = 'HAS_NG';
            else if (anyRecord) lastCheckStatus = 'ALL_OK';

            const allPlans = [];

            if (machine.pmPlans && machine.pmPlans.length > 0) {
                machine.pmPlans.forEach(plan => {
                    let status = 'NORMAL';
                    let daysUntil = null;

                    if (plan.nextPMDate) {
                        daysUntil = Math.ceil((new Date(plan.nextPMDate) - today) / (1000 * 60 * 60 * 24));
                        if (daysUntil < 0) {
                            status = 'OVERDUE';
                        } else if (daysUntil <= plan.advanceNotifyDays) {
                            status = 'UPCOMING';
                        }
                    } else {
                        status = 'NO_SCHEDULE';
                    }

                    allPlans.push({
                        preventiveTypeId: plan.preventiveTypeId,
                        preventiveTypeName: plan.preventiveType?.name || 'Unknown',
                        status: status,
                        daysUntil: daysUntil,
                        nextPMDate: plan.nextPMDate,
                        isCritical: false
                    });
                });
            }

            // Determine Worst Status and Critical Plan
            const overduePlans = allPlans.filter(p => p.status === 'OVERDUE');
            if (overduePlans.length > 0) {
                worstStatus = 'OVERDUE';
                overduePlans.sort((a, b) => a.daysUntil - b.daysUntil);
                overduePlans[0].isCritical = true;
                minDaysUntil = overduePlans[0].daysUntil;
                targetNextDate = overduePlans[0].nextPMDate;
                targetTypeName = overduePlans[0].preventiveTypeName;
            } else {
                const upcomingPlans = allPlans.filter(p => p.status === 'UPCOMING');
                if (upcomingPlans.length > 0) {
                    worstStatus = 'UPCOMING';
                    upcomingPlans.sort((a, b) => a.daysUntil - b.daysUntil);
                    upcomingPlans[0].isCritical = true;
                    minDaysUntil = upcomingPlans[0].daysUntil;
                    targetNextDate = upcomingPlans[0].nextPMDate;
                    targetTypeName = upcomingPlans[0].preventiveTypeName;
                } else {
                    const normalPlans = allPlans.filter(p => p.status === 'NORMAL' && p.nextPMDate);
                    if (normalPlans.length > 0) {
                        worstStatus = 'NORMAL';
                        normalPlans.sort((a, b) => a.daysUntil - b.daysUntil);
                        normalPlans[0].isCritical = true;
                        minDaysUntil = normalPlans[0].daysUntil;
                        targetNextDate = normalPlans[0].nextPMDate;
                        targetTypeName = normalPlans[0].preventiveTypeName;
                    }
                }
            }

            return {
                id: machine.id,
                name: machine.name,
                code: machine.code,
                location: machine.location,
                area: machine.machineMaster?.machineType?.area?.name || 'Unknown',
                areaId: machine.machineMaster?.machineType?.area?.id,
                type: machine.machineMaster?.machineType?.name || 'Unknown',
                preventiveType: targetTypeName,
                status: worstStatus,
                lastCheckStatus,
                nextPMDate: targetNextDate,
                lastPMDate: null,
                daysUntil: minDaysUntil === 9999 ? null : minDaysUntil,
                frequencyDays: 0,
                allPlans: allPlans
            };
        });

        res.json(statusList);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Reschedule PM Date
exports.reschedulePM = async (req, res) => {
    try {
        const { machineId, preventiveTypeId, newDate } = req.body;

        if (!machineId || !preventiveTypeId || !newDate) {
            return res.status(400).json({ error: 'machineId, preventiveTypeId และ newDate จำเป็นต้องระบุ' });
        }

        // [RBAC] Check permission using middleware
        if (req.assignedMachineIds) {
            // Need to check permissionType - query user for that specific field
            const user = await prisma.userMaster.findUnique({
                where: { id: req.user.id },
                select: { permissionType: true }
            });

            if (user?.permissionType === 'PM_ONLY') {
                return res.status(403).json({ error: 'คุณไม่มีสิทธิ์เลื่อนวัน PM' });
            }

            if (!req.assignedMachineIds.includes(parseInt(machineId))) {
                return res.status(403).json({ error: 'คุณไม่มีสิทธิ์เข้าถึงเครื่องนี้' });
            }
        }

        // Find and update the PM plan
        const plan = await prisma.machinePMPlan.findUnique({
            where: {
                machineId_preventiveTypeId: {
                    machineId: parseInt(machineId),
                    preventiveTypeId: parseInt(preventiveTypeId)
                }
            },
            include: {
                machine: true,
                preventiveType: true
            }
        });

        if (!plan) {
            return res.status(404).json({ error: 'ไม่พบแผน PM สำหรับเครื่องและประเภทที่ระบุ' });
        }

        // Update next PM date
        const updatedPlan = await prisma.machinePMPlan.update({
            where: { id: plan.id },
            data: {
                nextPMDate: new Date(newDate)
            },
            include: {
                machine: true,
                preventiveType: true
            }
        });

        // Emit socket event
        if (req.io) {
            req.io.emit('pm_update', { action: 'reschedule', machineId, preventiveTypeId });
            req.io.emit('dashboard_update');
        }

        res.json({
            message: 'เลื่อนวัน PM สำเร็จ',
            plan: updatedPlan
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// [NEW] Get Failure Breakdown (Drill-down)
exports.getFailureBreakdown = async (req, res) => {
    try {
        const { year, level, parentId } = req.query;
        // level: 'AREA' | 'TYPE' | 'MACHINE' | 'TOPIC'

        const where = {};

        // [PERF] Use req.assignedMachineIds from RBAC middleware
        const assignedMachineIds = req.assignedMachineIds;

        // Date Filter
        const dateFilter = year ? {
            date: {
                gte: new Date(`${year}-01-01`),
                lte: new Date(`${year}-12-31T23:59:59`)
            }
        } : {};

        let results = [];

        // ---------------------------------------------------------
        // LEVEL 1: AREA (Root)
        // ---------------------------------------------------------
        if (!level || level === 'AREA') {
            // Fetch all Areas
            const areas = await prisma.area.findMany({
                include: {
                    machineTypes: {
                        include: {
                            machineMasters: {
                                include: {
                                    machines: {
                                        select: { id: true }
                                    }
                                }
                            }
                        }
                    }
                }
            });

            // Count failures per Area
            for (const area of areas) {
                // Collect all machine Ids in this area
                const machineIdsInArea = [];
                area.machineTypes.forEach(mt => {
                    mt.machineMasters.forEach(mm => {
                        mm.machines.forEach(m => {
                            if (!assignedMachineIds || assignedMachineIds.includes(m.id)) {
                                machineIdsInArea.push(m.id);
                            }
                        });
                    });
                });

                if (machineIdsInArea.length === 0) continue;

                // Count NG records for these machines
                const count = await prisma.pMRecordDetail.count({
                    where: {
                        isPass: false,
                        record: {
                            machineId: { in: machineIdsInArea },
                            ...dateFilter
                        }
                    }
                });

                if (count > 0) {
                    results.push({
                        id: area.id,
                        name: area.name,
                        value: count,
                        level: 'AREA'
                    });
                }
            }

            // [OPTIMIZATION] If only 1 Area found, Auto-skip to TYPE level
            if (results.length === 1) {
                return exports.getFailureBreakdown({
                    ...req,
                    query: { ...req.query, level: 'TYPE', parentId: results[0].id }
                }, res);
            }
        }

        // ---------------------------------------------------------
        // LEVEL 2: MACHINE TYPE (Parent: Area)
        // ---------------------------------------------------------
        else if (level === 'TYPE') {
            const areaId = parseInt(parentId);

            const machineTypes = await prisma.machineType.findMany({
                where: { areaId: areaId },
                include: {
                    machineMasters: {
                        include: {
                            machines: { select: { id: true } }
                        }
                    }
                }
            });

            for (const type of machineTypes) {
                const machineIdsInType = [];
                type.machineMasters.forEach(mm => {
                    mm.machines.forEach(m => {
                        if (!assignedMachineIds || assignedMachineIds.includes(m.id)) {
                            machineIdsInType.push(m.id);
                        }
                    });
                });

                if (machineIdsInType.length === 0) continue;

                const count = await prisma.pMRecordDetail.count({
                    where: {
                        isPass: false,
                        record: {
                            machineId: { in: machineIdsInType },
                            ...dateFilter
                        }
                    }
                });

                if (count > 0) {
                    results.push({
                        id: type.id,
                        name: type.name,
                        value: count,
                        level: 'TYPE'
                    });
                }
            }
        }

        // ---------------------------------------------------------
        // LEVEL 3: MACHINE (Parent: Machine Type)
        // ---------------------------------------------------------
        else if (level === 'MACHINE') {
            const typeId = parseInt(parentId);

            // Find machines via MachineMaster -> MachineType
            const machines = await prisma.machine.findMany({
                where: {
                    machineMaster: {
                        machineTypeId: typeId
                    },
                    ...(assignedMachineIds ? { id: { in: assignedMachineIds } } : {})
                }
            });

            for (const machine of machines) {
                const count = await prisma.pMRecordDetail.count({
                    where: {
                        isPass: false,
                        record: {
                            machineId: machine.id,
                            ...dateFilter
                        }
                    }
                });

                if (count > 0) {
                    results.push({
                        id: machine.id,
                        name: machine.name || machine.code,
                        value: count,
                        level: 'MACHINE'
                    });
                }
            }
        }

        // ---------------------------------------------------------
        // LEVEL 4: TOPIC (Parent: Machine)
        // ---------------------------------------------------------
        else if (level === 'TOPIC') {
            const machineId = parseInt(parentId);

            const details = await prisma.pMRecordDetail.findMany({
                where: {
                    isPass: false,
                    record: {
                        machineId: machineId,
                        ...dateFilter
                    }
                },
                include: {
                    record: {
                        select: { date: true, inspector: true, remark: true }
                    },
                    masterChecklist: { select: { topic: true } }
                }
            });

            // Group by Topic
            const topicMap = {}; // topicName -> { count, details: [] }

            details.forEach(d => {
                const topicName = d.topic || d.masterChecklist?.topic || "Unknown";

                if (!topicMap[topicName]) {
                    topicMap[topicName] = {
                        id: topicName, // Use name as ID for topic
                        name: topicName,
                        value: 0,
                        level: 'TOPIC',
                        occurrences: []
                    };
                }

                topicMap[topicName].value++;
                topicMap[topicName].occurrences.push({
                    date: d.record.date,
                    inspector: d.record.inspector,
                    remark: d.remark || d.record.remark // Item remark or record remark
                });
            });

            results = Object.values(topicMap);
        }

        res.json(results);

    } catch (error) {
        console.error("Drilldown Error:", error);
        res.status(500).json({ error: error.message });
    }
};
