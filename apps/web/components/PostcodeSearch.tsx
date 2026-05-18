'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'

export default function PostcodeSearch() {
  const [postcode, setPostcode] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const cleaned = postcode.replace(/\s/g, '').toUpperCase()
    if (!cleaned) {
      setError('Please enter a postcode.')
      return
    }
    setError('')
    router.push(`/report/${cleaned}`)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
      <div className="flex-1">
        <label htmlFor="postcode-input" className="sr-only">UK Postcode</label>
        <input
          id="postcode-input"
          type="text"
          value={postcode}
          onChange={(e) => setPostcode(e.target.value)}
          placeholder="e.g. SW1A 1AA"
          className="w-full px-4 py-3 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
          autoComplete="postal-code"
          spellCheck={false}
        />
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
      <button
        type="submit"
        className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors text-base whitespace-nowrap"
      >
        Search
      </button>
    </form>
  )
}
