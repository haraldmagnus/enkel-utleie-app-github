import React from 'react';

export default function UserNotRegisteredError() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <div className="text-center max-w-sm">
        <p className="text-gray-500">Bruker ikke registrert.</p>
      </div>
    </div>
  );
}