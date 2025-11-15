import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { getSession } from 'next-auth/react';

// HTTP connection to the API
const httpLink = new HttpLink({
  uri: '/api/graphql',
});

// Authentication link - adds auth token to headers
const authLink = setContext(async (_, { headers }) => {
  const session = await getSession();
  
  return {
    headers: {
      ...headers,
      authorization: session?.user ? `Bearer ${session.user.email}` : '',
    }
  };
});

// Apollo Client instance
export const apolloClient = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
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