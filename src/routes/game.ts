import { FastifyInstance } from "fastify"
import { prisma } from "../lib/prisma"
import { date, z } from 'zod';
import { authenticate } from "../plugins/authenticate"
import { transformDocument } from "@prisma/client/runtime";

export async function gameRoutes(fastify: FastifyInstance) {

  fastify.get('/pools/:id/games', {
    onRequest: [authenticate]
  }, async (request) => {

    const gamePoolBody = z.object({
      id: z.string(),
    });

    const { id } = gamePoolBody.parse(request.params);

    const games = await prisma.game.findMany({
      orderBy: {
        date: 'desc',
      },
      include: {
        guesses: {
          where: {
            participant: {
              userId: request.user.sub,
              poolId: id,
            }  
          }
        }
      }
    })

    return {
      games: games.map(game => {
        return {
          ...game,
          guess: game.guesses.length > 0 ? game.guesses[0] : null,
          guesses: undefined
        }
      })
    }

  })

  fastify.patch('/games/:id/result', {
    // onRequest: [authenticate]
  }, async (request, reply) => {

    const gameResultBody = z.object({
      firstTeamResult: z.number(),
      secondTeamResult: z.number(),
    });

    const gameResultParams = z.object({
      id: z.string(),
    });

    const { firstTeamResult, secondTeamResult } = gameResultBody.parse(request.body);
    const { id } = gameResultParams.parse(request.params);

    const game = await prisma.game.findUnique({
      where: {
        id
      }
    });

    if (!game) {
      return reply.status(400).send({
        message: "Jogo não existe"
      })
    }

    if (game.date > new Date()) {
      return reply.status(400).send({
        message: "Você não pode enviar o resultado antes do jogo terminar"
      })
    }

    await prisma.game.update({
      where: {
        id
      },
      data: {
        firstTeamResult,
        secondTeamResult
      }
    })

    const guesses = await prisma.guess.findMany({
      where: {
        gameId: id,
      },
      include: {
        participant: {
          select: {
            poolId: true
          }
        }
      }
    });

    const weight:number = game?.weight || 1;

    const firstTeamWin: boolean = firstTeamResult > secondTeamResult;
    const secondTeamWin: boolean = firstTeamResult < secondTeamResult;
    const draw: boolean = firstTeamResult === secondTeamResult;

    for (let guess of guesses) {

      let score: number = 0;

      if (guess.firstTeamPoints === firstTeamResult && guess.secondTeamPoints === secondTeamResult) {

        score += (10 * weight);

      }

      if (firstTeamWin && guess.firstTeamPoints > guess.secondTeamPoints) {

        score += (5 * weight);

      }

      if (secondTeamWin && guess.secondTeamPoints > guess.firstTeamPoints) {

        score += (5 * weight);

      }

      if (draw && guess.firstTeamPoints === guess.secondTeamPoints) {

        score += (5 * weight);

      }

      await prisma.score.create({
        data: {
          points: score,
          poolId: guess.participant.poolId,
          gameId: game.id,
          participantId: guess.participantId
        }
      })

    }

    return reply.status(204).send();

  })

  fastify.post('/pools/gamesbyparticipant', {
    onRequest: [authenticate]
  }, async (request) => {

    const gamePoolBody = z.object({
      participantId: z.string(),
    });

    const { participantId } = gamePoolBody.parse(request.body);

    const guesses = await prisma.participant.findUnique({
        where: {
          id: participantId,
        },
        include: {
          guesses: {
            select:{
              gameId: true,
              firstTeamPoints: true,
              secondTeamPoints: true, 
              game: {
                select:{
                  firstTeamCountryCode: true,
                  secondTeamCountryCode: true,
                  score: {
                    where:{
                      participantId
                    }
                  }
                }
                
              }
            }
          }
        }
    })

    return {
      guesses
    }

  })

}
