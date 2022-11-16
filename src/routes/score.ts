import { FastifyInstance } from "fastify"
import { prisma } from "../lib/prisma"
import { z } from 'zod';
import { authenticate } from "../plugins/authenticate"

export async function scoreRoutes(fastify: FastifyInstance) {

  fastify.get('/pools/:id/ranking', {
    onRequest: [authenticate]
  }, async (request) => {

    const poolRankingParams = z.object({
      id: z.string(),
    });

    const { id } = poolRankingParams.parse(request.params);

    const ranking = await prisma.score.groupBy({
      by: ['participantId'],
      where: {
        poolId: id
      },
      _sum: {
        points: true,
      },
      orderBy: {
        _sum: {
          points: 'desc'
        }
      },
    });

    let newObj:any[] = [];
    
    const participantIds = ranking.map((rank) => rank.participantId);
    
    const participantDatas = await prisma.participant.findMany({
      where:{
        id : {
          in: participantIds,
        }
      },
      include: {
        user: {
          select: {
            nome: true,
            avatarUrl: true
          }
        }
      }
    })


    for (let rank of ranking) {
      const actualUser = participantDatas.find((participant) => participant.id === rank.participantId)

      const obj = {
        participantId: rank.participantId,
        points: rank._sum.points,
        name: actualUser?.user.nome,
        avatarUrl: actualUser?.user.avatarUrl
      }

      newObj.push(obj);

    }

    return { ranking: newObj }

  })

}

