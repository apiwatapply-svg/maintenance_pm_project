const prisma = require('../prismaClient');

// [FIX] Helper function to check if a detail should be considered NG
// Skips "ghost items" - NUMERIC details with no value
const isDetailNG = (detail) => {
    if (detail.isPass) return false;
    const type = (detail.masterChecklist?.type || detail.checklist?.type || '').toUpperCase();
    // For NUMERIC type: skip if value is empty, null, or "null" string (ghost item)
    if (type === 'NUMERIC' && (!detail.value || detail.value.toString().trim() === '' || detail.value === 'null')) {
        return false;
    }
    return !detail.isPass;
};

exports.getDashboardStats = async (req, res) => {
    try {
        const today = new Date();

        // [PERF] Use req.assignedMachineIds from RBAC middleware
        const assignedMachineIds = req.assignedMachineIds;
        const whereClause = assignedMachineIds ? { id: { in: assignedMachineIds } } : {};

        // [PERF] Step 1: Load machines WITHOUT pmrecords (lightweight)
        const machines = await prisma.machine.findMany({
            where: whereClause,
            include: {
                pmPlans: {
                    include: {
                        preventiveType: true
                    }
                },
                machineMaster: {
                    include: {
                        machineType: {
                            include: { area: true }
                        }
                    }
                }
                // ❌ No pmrecords — was 20 records × N details × masterChecklist per machine
            }
        });

        // [FIX BUG-1] Step 2: Get latest record per (machine, preventiveType) pair
        // Use groupBy(_max id) instead of distinct+orderBy — Prisma's distinct is client-side
        // and does NOT guarantee returning the most recent row despite orderBy.
        const machineIds = machines.map(m => m.id);
        let latestRecords = [];
        if (machineIds.length > 0) {
            // Step 2a: Find the max record id per (machineId, preventiveTypeId)
            const latestGroups = await prisma.pMRecord.groupBy({
                by: ['machineId', 'preventiveTypeId'],
                where: {
                    machineId: { in: machineIds },
                    status: { in: ['COMPLETED', 'LATE'] }
                },
                _max: { id: true }
            });

            const latestIds = latestGroups
                .map(g => g._max.id)
                .filter(Boolean);

            // Step 2b: Fetch only those exact records (guaranteed latest)
            if (latestIds.length > 0) {
                latestRecords = await prisma.pMRecord.findMany({
                    where: { id: { in: latestIds } },
                    select: { id: true, machineId: true, preventiveTypeId: true }
                });
            }
        }

        // [PERF] Step 3: Batch check NG (filter ghost items)
        const latestRecordIds = latestRecords.map(r => r.id);
        let ngSet = new Set();
        if (latestRecordIds.length > 0) {
            const ngGroups = await prisma.pMRecordDetail.groupBy({
                by: ['recordId'],
                where: {
                    recordId: { in: latestRecordIds },
                    isPass: false,
                    NOT: [
                        { value: null },
                        { value: '' },
                        { value: 'null' }
                    ]
                }
            });
            ngSet = new Set(ngGroups.map(r => r.recordId));
        }

        // Build lookup: (machineId, preventiveTypeId) → lastCheckStatus
        const statusLookup = new Map();
        latestRecords.forEach(r => {
            const key = `${r.machineId}-${r.preventiveTypeId}`;
            statusLookup.set(key, ngSet.has(r.id) ? 'HAS_NG' : 'ALL_OK');
        });

        const status = {
            completed: 0,
            upcoming: 0,
            overdue: 0,
            has_ng: 0,
            total: 0
        };

        const rows = [];

        machines.forEach(machine => {
            if (!machine.pmPlans || machine.pmPlans.length === 0) {
                rows.push({
                    ...machine,
                    status: 'NO_PLAN',
                    pmConfig: null,
                    preventiveType: null,
                    preventiveTypeId: null
                });
                status.total++;
            } else {
                machine.pmPlans.forEach(plan => {
                    // [PERF] Use pre-computed lookup
                    const lookupKey = `${machine.id}-${plan.preventiveTypeId}`;
                    const lastCheckStatus = statusLookup.get(lookupKey) || null;

                    let scheduleStatus = 'OK';
                    if (plan.nextPMDate) {
                        const diff = Math.ceil((new Date(plan.nextPMDate) - today) / (1000 * 60 * 60 * 24));
                        if (diff < 0) scheduleStatus = 'OVERDUE';
                        else if (diff <= plan.advanceNotifyDays) scheduleStatus = 'UPCOMING';
                    }

                    if (lastCheckStatus === 'HAS_NG') {
                        status.has_ng++;
                    } else if (scheduleStatus === 'OVERDUE') {
                        status.overdue++;
                    } else if (scheduleStatus === 'UPCOMING') {
                        status.upcoming++;
                    } else {
                        status.completed++;
                    }

                    let planStatus = scheduleStatus;

                    rows.push({
                        id: machine.id,
                        code: machine.code,
                        name: machine.name,
                        model: machine.model,
                        location: machine.location,
                        machineMaster: machine.machineMaster,
                        status: planStatus,
                        lastCheckStatus,
                        preventiveType: plan.preventiveType ? {
                            id: plan.preventiveType.id,
                            name: plan.preventiveType.name
                        } : null,
                        preventiveTypeId: plan.preventiveTypeId,
                        pmConfig: {
                            frequencyDays: plan.frequencyDays,
                            advanceNotifyDays: plan.advanceNotifyDays,
                            lastPMDate: plan.lastPMDate,
                            nextPMDate: plan.nextPMDate
                        }
                    });
                    status.total++;
                });
            }
        });

        res.json({
            summary: status,
            machines: rows
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getOperatorStats = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        // [FIX BUG-2] Apply RBAC filter from loadAssignedMachines middleware
        const assignedMachineIds = req.assignedMachineIds;

        const where = {};
        if (startDate && endDate) {
            where.date = {
                gte: new Date(startDate),
                lte: new Date(endDate)
            };
        }
        // Filter by assigned machines for non-admin users (null = admin = no filter)
        if (assignedMachineIds) {
            where.machineId = { in: assignedMachineIds };
        }

        const records = await prisma.pMRecord.findMany({
            where,
            include: { machine: true }
        });

        // Aggregate by inspector
        const stats = {};
        records.forEach(r => {
            const inspector = r.inspector || 'Unknown';
            if (!stats[inspector]) {
                stats[inspector] = {
                    name: inspector,
                    total: 0,
                    completed: 0,
                    late: 0,
                    planned: 0
                };
            }
            stats[inspector].total++;
            if (r.status === 'COMPLETED') stats[inspector].completed++;
            else if (r.status === 'LATE') stats[inspector].late++;
            else stats[inspector].planned++;
        });

        res.json(Object.values(stats));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
