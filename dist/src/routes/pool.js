"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.poolRoutes = void 0;
const prisma_1 = require("../lib/prisma");
const short_unique_id_1 = __importDefault(require("short-unique-id"));
const zod_1 = require("zod");
const authenticate_1 = require("../plugins/authenticate");
async function poolRoutes(fastify) {
    fastify.get('/pools/count', async () => {
        const count = await prisma_1.prisma.pool.count();
        return { count };
    });
    fastify.post('/pools', async (request, reply) => {
        const createPoolBody = zod_1.z.object({
            title: zod_1.z.string(),
        });
        const { title } = createPoolBody.parse(request.body);
        const generate = new short_unique_id_1.default({ length: 6 });
        const code = String(generate()).toUpperCase();
        try {
            await request.jwtVerify();
            await prisma_1.prisma.pool.create({
                data: {
                    title,
                    code,
                    ownerId: request.user.sub,
                    participants: {
                        create: {
                            userId: request.user.sub
                        }
                    }
                }
            });
        }
        catch {
            await prisma_1.prisma.pool.create({
                data: {
                    title,
                    code
                }
            });
        }
        return reply.status(201).send({ code });
    });
    fastify.post('/pools/join', {
        onRequest: [authenticate_1.authenticate]
    }, async (request, reply) => {
        const joinPoolBody = zod_1.z.object({
            data: zod_1.z.object({
                code: zod_1.z.string(),
            }),
        });
        const { data } = joinPoolBody.parse(request.body);
        const pool = await prisma_1.prisma.pool.findUnique({
            where: {
                code: data.code
            },
            include: {
                participants: {
                    where: {
                        userId: request.user.sub
                    }
                }
            }
        });
        if (!pool) {
            return reply.status(400).send({
                message: 'Bolão não encontrado.'
            });
        }
        if (pool.participants.length > 0) {
            return reply.status(400).send({
                message: 'Você já está participando deste bolão.'
            });
        }
        if (!pool.ownerId) {
            await prisma_1.prisma.pool.update({
                where: {
                    id: pool.id
                },
                data: {
                    ownerId: request.user.sub
                }
            });
        }
        await prisma_1.prisma.participant.create({
            data: {
                poolId: pool.id,
                userId: request.user.sub
            }
        });
        return reply.status(201).send();
    });
    fastify.get('/pools', {
        onRequest: [authenticate_1.authenticate]
    }, async (request) => {
        const pools = await prisma_1.prisma.pool.findMany({
            where: {
                participants: {
                    some: {
                        userId: request.user.sub
                    }
                }
            },
            include: {
                _count: {
                    select: {
                        participants: true
                    }
                },
                participants: {
                    select: {
                        id: true,
                        user: {
                            select: {
                                avatarUrl: true
                            }
                        }
                    },
                    take: 4
                },
                owner: {
                    select: {
                        id: true,
                        nome: true
                    }
                }
            }
        });
        return { pools };
    });
    fastify.get('/pools/:id', {
        onRequest: [authenticate_1.authenticate]
    }, async (request) => {
        const joinPoolBody = zod_1.z.object({
            id: zod_1.z.string(),
        });
        const { id } = joinPoolBody.parse(request.params);
        const pool = await prisma_1.prisma.pool.findUnique({
            where: {
                id
            },
            include: {
                _count: {
                    select: {
                        participants: true
                    }
                },
                participants: {
                    select: {
                        id: true,
                        user: {
                            select: {
                                avatarUrl: true
                            }
                        }
                    },
                    take: 4
                },
                owner: {
                    select: {
                        id: true,
                        nome: true
                    }
                }
            }
        });
        return { pool };
    });
}
exports.poolRoutes = poolRoutes;
