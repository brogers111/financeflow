import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client';
import { SetContextLink } from '@apollo/client/link/context';
import { getSession } from 'next-auth/react';

const httpLink = new HttpLink({
  uri: '/api/graphql',
});

const authLink = new SetContextLink(async (prevContext, operation) => {
  const session = await getSession();
  
  return {
    headers: {
      ...prevContext.headers,
      authorization: session?.user ? `Bearer ${session.user.email}` : '',
    }
  };
});

export const apolloClient = new ApolloClient({
  link: authLink.concat(httpLink),
  
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          transactions: {
            merge(existing = [], incoming) {
              return [...existing, ...incoming];
            },
          },
        },
      },
    },
  }),
  
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
      errorPolicy: 'all',
    },
    query: {
      fetchPolicy: 'network-only',
      errorPolicy: 'all',
    },
    mutate: {
      errorPolicy: 'all',
    },
  },
});