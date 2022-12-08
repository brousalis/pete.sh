import axios from 'axios';
import React from 'react';

export default function CreateLink() {
  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const res = await axios.post('/api/shorten', { 
        url: event.target.url?.value, 
        slug: event.target.slug?.value
      })
      console.log(res)
    } catch (error) {
      console.error(error)
    }
    console.log(event);
  };

  return (
    <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
      <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
        <form className="space-y-6" onSubmit={handleSubmit} noValidate>
          <div className="mt-1">
            <label htmlFor="url" className="block text-sm font-medium text-gray-700">
              <input
                id="url"
                placeholder="url"
                name="url"
                autoComplete="off"
                required
                className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              />
            </label>
          </div>

          <div>
            <label htmlFor="slug" className="block text-sm font-medium text-gray-700">
              https://pete.sh/
            </label>
            <div className="mt-1">
              <input
                id="slug"
                name="slug"
                type="slug"
                autoComplete="off"
                required
                className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="flex w-full justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              shorten
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
