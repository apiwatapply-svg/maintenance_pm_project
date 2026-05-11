const prisma = require('../prismaClient');
const {
    buildJobRequestCreateData,
    buildJobRequestNo,
    validateJobRequestInput,
} = require('../services/jobRequest.service');
const { buildSocketPayload, emitFeatureEvent } = require('../services/socket.service');

const categoryOptions = [
    { value: 'mechanical', label: 'Mechanical' },
    { value: 'electrical', label: 'Electrical' },
    { value: 'pneumatic', label: 'Pneumatic' },
    { value: 'hydraulic', label: 'Hydraulic' },
    { value: 'safety', label: 'Safety' },
    { value: 'OTHER', label: 'Other' },
];

const symptomOptions = [
    { value: 'abnormal_noise', label: 'Abnormal noise' },
    { value: 'vibration', label: 'Vibration' },
    { value: 'oil_leak', label: 'Oil leak' },
    { value: 'air_leak', label: 'Air leak' },
    { value: 'not_starting', label: 'Not starting' },
    { value: 'quality_issue', label: 'Quality issue' },
    { value: 'OTHER', label: 'Other' },
];

function buildActor(user) {
    return user ? { id: user.id, name: user.name || user.username } : null;
}

function emitJobRequestEvent(req, event, jobRequest) {
    if (!req.io) {
        return;
    }

    const payload = buildSocketPayload({
        event,
        actor: buildActor(req.user),
        data: jobRequest,
        meta: {
            feature: 'job_request',
            job_request_id: jobRequest.id,
        },
    });

    emitFeatureEvent(req.io, 'global', payload);
    req.io.to(`feature:job_request`).emit(event, payload);
    req.io.to(`job_request:${jobRequest.id}`).emit(event, payload);
}

function mapJobRequest(jobRequest) {
    return {
        ...jobRequest,
        machineNo: jobRequest.machine?.code || null,
        zone: jobRequest.machine?.machineMaster?.machineType?.area?.name || null,
        machineType: jobRequest.machine?.machineMaster?.machineType?.name || null,
    };
}

exports.getOptions = async (req, res) => {
    try {
        const machines = await prisma.machine.findMany({
            where: {
                ...(req.assignedMachineIds ? { id: { in: req.assignedMachineIds } } : {}),
            },
            select: {
                id: true,
                code: true,
                name: true,
                location: true,
                machineMaster: {
                    select: {
                        machineType: {
                            select: {
                                id: true,
                                name: true,
                                area: { select: { id: true, name: true } },
                            },
                        },
                    },
                },
            },
            orderBy: { code: 'asc' },
        });

        res.json({
            success: true,
            data: {
                categories: categoryOptions,
                symptoms: symptomOptions,
                machines: machines.map((machine) => {
                    const zone = machine.machineMaster?.machineType?.area || null;
                    const type = machine.machineMaster?.machineType || null;
                    return {
                        id: machine.id,
                        machineNo: machine.code,
                        name: machine.name,
                        location: machine.location,
                        zoneId: zone?.id || null,
                        zoneName: zone?.name || 'Unassigned Zone',
                        typeId: type?.id || null,
                        typeName: type?.name || 'Unassigned Type',
                        label: `${zone?.name || 'Unassigned Zone'} / ${type?.name || 'Unassigned Type'} / ${machine.code} - ${machine.name}`,
                    };
                }),
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
};

exports.listJobRequests = async (req, res) => {
    try {
        const requests = await prisma.jobRequest.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                machine: {
                    include: {
                        machineMaster: {
                            include: {
                                machineType: {
                                    include: { area: true },
                                },
                            },
                        },
                    },
                },
                createdBy: { select: { id: true, name: true, username: true } },
            },
        });

        res.json({ success: true, data: requests.map(mapJobRequest) });
    } catch (error) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
};

exports.createJobRequest = async (req, res) => {
    try {
        const validation = validateJobRequestInput(req.body);
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    details: validation.errors,
                },
            });
        }

        const today = new Date();
        const startOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
        const endOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 1));
        const dailyCount = await prisma.jobRequest.count({
            where: {
                createdAt: {
                    gte: startOfDay,
                    lt: endOfDay,
                },
            },
        });

        const data = buildJobRequestCreateData(req.body, req.user);
        const created = await prisma.jobRequest.create({
            data: {
                ...data,
                requestNo: buildJobRequestNo(today, dailyCount),
            },
            include: {
                machine: {
                    include: {
                        machineMaster: {
                            include: {
                                machineType: {
                                    include: { area: true },
                                },
                            },
                        },
                    },
                },
                createdBy: { select: { id: true, name: true, username: true } },
            },
        });

        const responseData = mapJobRequest(created);
        emitJobRequestEvent(req, 'job_request:created', responseData);

        res.status(201).json({ success: true, data: responseData });
    } catch (error) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
};

exports.getJobRequest = async (req, res) => {
    try {
        const jobRequest = await prisma.jobRequest.findUnique({
            where: { id: parseInt(req.params.id) },
            include: {
                machine: {
                    include: {
                        machineMaster: {
                            include: {
                                machineType: {
                                    include: { area: true },
                                },
                            },
                        },
                    },
                },
                createdBy: { select: { id: true, name: true, username: true } },
                comments: {
                    include: { user: { select: { id: true, name: true, username: true } } },
                    orderBy: { createdAt: 'asc' },
                },
                files: { orderBy: { createdAt: 'asc' } },
            },
        });

        if (!jobRequest) {
            return res.status(404).json({ success: false, error: { message: 'Job Request not found' } });
        }

        res.json({ success: true, data: mapJobRequest(jobRequest) });
    } catch (error) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
};

exports.updateJobRequest = async (req, res) => {
    try {
        const updateData = {};
        ['status', 'priority', 'category', 'categoryOther', 'symptom', 'symptomOther', 'description'].forEach((field) => {
            if (req.body[field] !== undefined) {
                updateData[field] = req.body[field];
            }
        });

        if (req.body.productionImpact !== undefined) updateData.productionImpact = Boolean(req.body.productionImpact);
        if (req.body.machineStopped !== undefined) updateData.machineStopped = Boolean(req.body.machineStopped);
        if (req.body.ngCount !== undefined) updateData.ngCount = req.body.ngCount === '' ? null : parseInt(req.body.ngCount);

        const updated = await prisma.jobRequest.update({
            where: { id: parseInt(req.params.id) },
            data: updateData,
            include: { machine: true, createdBy: { select: { id: true, name: true, username: true } } },
        });

        emitJobRequestEvent(req, 'job_request:status_changed', updated);
        res.json({ success: true, data: updated });
    } catch (error) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
};

exports.addComment = async (req, res) => {
    try {
        if (!req.body.comment || !req.body.comment.trim()) {
            return res.status(400).json({ success: false, error: { message: 'comment is required' } });
        }

        const comment = await prisma.jobRequestComment.create({
            data: {
                jobRequestId: parseInt(req.params.id),
                userId: req.user?.id || null,
                comment: req.body.comment.trim(),
            },
            include: { user: { select: { id: true, name: true, username: true } } },
        });

        emitJobRequestEvent(req, 'job_request:comment_added', { id: parseInt(req.params.id), comment });
        res.status(201).json({ success: true, data: comment });
    } catch (error) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
};
