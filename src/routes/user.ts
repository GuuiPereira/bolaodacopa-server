import { FastifyInstance } from "fastify"
import { prisma } from "../lib/prisma"

export async function userRoutes(fastify:FastifyInstance){

  fastify.get('/users/count', async () => {

    const count = await prisma.user.count()
    return { count }
  
  })

  fastify.get('/users/lastFourImageRegistered', async () => {

    const srcs = await prisma.user.findMany({
      where: { 
        NOT: [{ avatarUrl: null }] 
      },
      orderBy: {
        id: 'desc',
      },
      select: {
        avatarUrl: true,
      },
      take: 4
      
    })
    return { srcs }

  })
  
}

