"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const user = await prisma.user.create({
        data: {
            nome: 'Guilherme Pereira',
            email: 'guilherme@gmail.com',
            avatarUrl: 'https://github.com/guuipereira.png',
        }
    });
    const pool = await prisma.pool.create({
        data: {
            title: 'Bolao numero 1',
            code: 'BOL123',
            ownerId: user.id,
            participants: {
                create: {
                    userId: user.id
                }
            }
        }
    });
    const game = await prisma.game.create({
        data: {
            date: '2022-11-02T12:00:00.015Z',
            firstTeamCountryCode: 'DE',
            secondTeamCountryCode: 'BR'
        }
    });
    const game2 = await prisma.game.create({
        data: {
            date: '2022-11-04T12:00:00.015Z',
            firstTeamCountryCode: 'BR',
            secondTeamCountryCode: 'AR',
            guesses: {
                create: {
                    firstTeamPoints: 3,
                    secondTeamPoints: 1,
                    participant: {
                        connect: {
                            userId_poolId: {
                                userId: user.id,
                                poolId: pool.id
                            }
                        }
                    }
                }
            }
        }
    });
}
main();
