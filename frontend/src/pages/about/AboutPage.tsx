import React from 'react';

const AboutPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
            We're tired of fake sustainability. So we built something real.
          </h1>
          <p className="text-xl md:text-2xl opacity-90 leading-relaxed">
            You know that feeling when you spend hours researching if a brand is actually sustainable, 
            only to find contradictory reviews and vague "eco-friendly" claims? Yeah, we felt that too.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* The Problem */}
        <section className="mb-16">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              The Problem
            </h2>
            <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
              There are <span className="font-semibold text-primary-600">127,000 brands</span> claiming to be sustainable, 
              but nearly <span className="font-semibold text-red-600">30% are straight-up greenwashing</span>. 
              Meanwhile, the brands actually doing good work can't break through the noise.
            </p>
          </div>
        </section>

        {/* What We Do */}
        <section className="mb-16">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              What we do
            </h2>
            <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
              We built the first AI-enhanced sustainable shopping platform that combines smart discovery, 
              verified green ratings, and live community commerce.
            </p>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-primary-600 rounded-full mt-3"></div>
                <p className="text-gray-700 dark:text-gray-300">
                  Our AI learns your values and finds products that match them
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-primary-600 rounded-full mt-3"></div>
                <p className="text-gray-700 dark:text-gray-300">
                  Our Green Rating System verifies which brands are actually sustainable
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-primary-600 rounded-full mt-3"></div>
                <p className="text-gray-700 dark:text-gray-300">
                  Through live shopping streams, you connect directly with authentic brands and other conscious shoppers
                </p>
              </div>
            </div>
            <p className="text-lg font-medium text-primary-600 mt-6 italic">
              Enhanced by AI, driven by authentic human connections.
            </p>
          </div>
        </section>

        {/* Mission & Vision */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {/* Mission */}
          <section>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 h-full">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Our mission
              </h2>
              <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
                Make sustainable shopping transparent, trustworthy, and community-driven. 
                Because the planet doesn't have time for greenwashing, and neither do you.
              </p>
            </div>
          </section>

          {/* Vision */}
          <section>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 h-full">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Our vision
              </h2>
              <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
                A world where AI educates instead of manipulates, where community drives brand accountability, 
                and where every purchase creates real environmental impact.
              </p>
            </div>
          </section>
        </div>

        {/* Call to Action */}
        <section className="text-center">
          <div className="bg-gradient-to-r from-primary-50 to-green-50 dark:from-primary-900/20 dark:to-green-900/20 rounded-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Join the Movement
            </h2>
            <p className="text-lg text-gray-700 dark:text-gray-300 mb-6">
              Be part of a community that's making sustainable shopping the new normal.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/live-streams"
                className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 transition-colors"
              >
                Explore Live Streams
              </a>
              <a
                href="/products"
                className="inline-flex items-center justify-center px-6 py-3 border border-primary-600 text-base font-medium rounded-md text-primary-600 bg-white hover:bg-primary-50 dark:bg-gray-800 dark:text-primary-400 dark:border-primary-400 dark:hover:bg-gray-700 transition-colors"
              >
                Browse Products
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AboutPage;