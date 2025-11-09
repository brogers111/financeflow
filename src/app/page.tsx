export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold mb-4">Finance Flow</h1>
        <p className="text-xl">Your personal finance tracking system</p>
        
        <div className="mt-8">
          <a 
            href="/api/graphql" 
            className="text-blue-500 hover:underline"
            target="_blank"
          >
            → Open GraphQL Playground
          </a>
        </div>
      </div>
    </main>
  );
}