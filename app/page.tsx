import Image from "next/image";

import FileShare from './components/FileShare';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <FileShare />
    </div>
  );
}
