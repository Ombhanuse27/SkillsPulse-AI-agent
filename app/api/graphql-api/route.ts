import { createSchema, createYoga } from 'graphql-yoga';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const typeDefs = `
  type Resource {
    id: String
    title: String
    url: String
    type: String
  }
  type Milestone {
    id: String
    title: String
    description: String
    week: Int
    status: String
    resources: [Resource]
  }
  type Roadmap {
    id: String
    title: String
    createdAt: String
    milestones: [Milestone]
  }
  type Query {
    myRoadmaps(userId: String!): [Roadmap]
  }
`;

const resolvers = {
  Query: {
    myRoadmaps: async (_: any, { userId }: { userId: string }) => {
      return await prisma.roadmap.findMany({
        where: { userId },
        include: { milestones: { include: { resources: true } } },
        orderBy: { createdAt: 'desc' }
      });
    }
  }
};

const schema = createSchema({ typeDefs, resolvers });

const yoga = createYoga({
  schema,
  graphqlEndpoint: '/api/graphql-api',
  fetchAPI: { Response }
});

export { yoga as GET, yoga as POST };