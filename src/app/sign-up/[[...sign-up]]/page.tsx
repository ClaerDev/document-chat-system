import { SignUp } from '@clerk/nextjs'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign Up - Document Chat System',
  description: 'Create your Document Chat System account'
}

export default function Page() {
  return (
    <>
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Document Chat System</h1>
            <p className="text-gray-600 mt-2">Create your account</p>
          </div>
          <SignUp
            afterSignUpUrl="/dashboard"
            appearance={{
              elements: {
                formButtonPrimary: 'bg-blue-600 hover:bg-blue-700 text-sm',
                card: 'shadow-lg',
              },
            }}
          />
        </div>
      </div>
    </>
  )
}