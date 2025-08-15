import React from 'react';
import VdoNinjaEnhancedDemo from '@/components/debug/VdoNinjaEnhancedDemo';

export default function VdoNinjaTestPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-8">
          VDO.Ninja Enhanced Integration Test
        </h1>
        <VdoNinjaEnhancedDemo />
      </div>
    </div>
  );
}