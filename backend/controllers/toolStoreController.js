const prisma = require('../prismaClient');
const {
    buildToolStoreItemData,
    buildToolStoreTransactionData,
    calculateNextStock,
    validateToolStoreItem,
    validateToolStoreTransaction,
} = require('../services/toolStore.service');
const { buildSocketPayload, emitFeatureEvent } = require('../services/socket.service');

const itemTypeOptions = [
    { value: 'TOOLING', label: 'Tooling' },
    { value: 'SPARE_PART', label: 'Store / Spare Part' },
];

const actionOptions = [
    { value: 'RECEIVE', label: 'Receive' },
    { value: 'ISSUE', label: 'Issue' },
    { value: 'BORROW', label: 'Borrow' },
    { value: 'RETURN', label: 'Return' },
];

const categoryOptions = [
    { value: 'hand_tool', label: 'Hand Tool' },
    { value: 'measurement', label: 'Measurement' },
    { value: 'fixture', label: 'Fixture' },
    { value: 'consumable', label: 'Consumable' },
    { value: 'spare_part', label: 'Spare Part' },
    { value: 'OTHER', label: 'Other' },
];

function buildActor(user) {
    return user ? { id: user.id, name: user.name || user.username } : null;
}

function emitToolStoreEvent(req, event, data) {
    if (!req.io) return;

    const payload = buildSocketPayload({
        event,
        actor: buildActor(req.user),
        data,
        meta: {
            feature: 'tool_store',
            item_id: data.itemId || data.id,
        },
    });

    emitFeatureEvent(req.io, 'global', payload);
    req.io.to('feature:tooling').emit(event, payload);
    req.io.to('feature:spare_part').emit(event, payload);
    req.io.to('feature:tool_store').emit(event, payload);
}

function buildItemWhere(query = {}) {
    const where = {};
    if (query.itemType) where.itemType = String(query.itemType).toUpperCase();
    if (query.status) where.status = String(query.status).toUpperCase();
    if (query.search) {
        const search = String(query.search);
        where.OR = [
            { itemCode: { contains: search } },
            { name: { contains: search } },
            { barcode: { contains: search } },
            { category: { contains: search } },
        ];
    }
    return where;
}

exports.getOptions = async (req, res) => {
    try {
        const machines = await prisma.machine.findMany({
            select: {
                id: true,
                code: true,
                name: true,
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
                itemTypes: itemTypeOptions,
                actions: actionOptions,
                categories: categoryOptions,
                machines: machines.map((machine) => {
                    const zone = machine.machineMaster?.machineType?.area || null;
                    const type = machine.machineMaster?.machineType || null;
                    return {
                        id: machine.id,
                        machineNo: machine.code,
                        name: machine.name,
                        zoneName: zone?.name || 'Unassigned Zone',
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

exports.listItems = async (req, res) => {
    try {
        const items = await prisma.toolStoreItem.findMany({
            where: buildItemWhere(req.query),
            orderBy: [{ itemType: 'asc' }, { itemCode: 'asc' }],
        });

        res.json({ success: true, data: items });
    } catch (error) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
};

exports.createItem = async (req, res) => {
    try {
        const validation = validateToolStoreItem(req.body);
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', details: validation.errors },
            });
        }

        const item = await prisma.toolStoreItem.create({
            data: buildToolStoreItemData(req.body),
        });

        emitToolStoreEvent(req, 'tool_store:item_created', item);
        res.status(201).json({ success: true, data: item });
    } catch (error) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
};

exports.findByScanCode = async (req, res) => {
    try {
        const scanCode = String(req.params.scanCode || '').trim();
        const item = await prisma.toolStoreItem.findFirst({
            where: {
                OR: [
                    { itemCode: scanCode.toUpperCase() },
                    { barcode: scanCode },
                ],
            },
        });

        if (!item) {
            return res.status(404).json({ success: false, error: { message: 'Item not found' } });
        }

        res.json({ success: true, data: item });
    } catch (error) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
};

exports.listTransactions = async (req, res) => {
    try {
        const transactions = await prisma.toolStoreTransaction.findMany({
            take: 100,
            orderBy: { createdAt: 'desc' },
            include: {
                item: true,
                machine: { select: { id: true, code: true, name: true } },
                user: { select: { id: true, name: true, username: true } },
                jobRequest: { select: { id: true, requestNo: true, status: true } },
            },
        });

        res.json({ success: true, data: transactions });
    } catch (error) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
};

exports.createTransaction = async (req, res) => {
    try {
        const validation = validateToolStoreTransaction(req.body);
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', details: validation.errors },
            });
        }

        const inputData = buildToolStoreTransactionData(req.body, req.user);

        const result = await prisma.$transaction(async (tx) => {
            const item = await tx.toolStoreItem.findUnique({
                where: { id: inputData.itemId },
            });

            if (!item) {
                const error = new Error('Item not found');
                error.statusCode = 404;
                throw error;
            }

            const afterStock = calculateNextStock(
                item.currentStock,
                inputData.action,
                inputData.quantity
            );

            const transaction = await tx.toolStoreTransaction.create({
                data: {
                    ...inputData,
                    beforeStock: item.currentStock,
                    afterStock,
                },
                include: {
                    item: true,
                    machine: { select: { id: true, code: true, name: true } },
                    user: { select: { id: true, name: true, username: true } },
                    jobRequest: { select: { id: true, requestNo: true, status: true } },
                },
            });

            const updatedItem = await tx.toolStoreItem.update({
                where: { id: item.id },
                data: { currentStock: afterStock },
            });

            return { transaction, item: updatedItem };
        });

        emitToolStoreEvent(req, `tool_store:${inputData.action.toLowerCase()}`, result.transaction);
        res.status(201).json({ success: true, data: result });
    } catch (error) {
        res.status(error.statusCode || 500).json({ success: false, error: { message: error.message } });
    }
};
