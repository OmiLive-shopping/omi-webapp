import React from 'react';
import CouponTimer, { CouponTimerList } from './CouponTimer';

export const CouponTimerDemo: React.FC = () => {
  // Create sample expiration dates
  const in30Minutes = new Date(Date.now() + 30 * 60 * 1000);
  const in2Hours = new Date(Date.now() + 2 * 60 * 60 * 1000);
  const in1Day = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const in5Days = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);

  const sampleCoupons = [
    {
      id: '1',
      code: 'FLASH30',
      expiresAt: in30Minutes,
      discountPercentage: 30
    },
    {
      id: '2',
      code: 'SAVE20',
      expiresAt: in2Hours,
      discountPercentage: 20
    },
    {
      id: '3',
      code: 'WEEK15',
      expiresAt: in5Days,
      discountPercentage: 15
    }
  ];

  return (
    <div className="space-y-8 p-6 bg-gray-50 dark:bg-gray-900 rounded-lg">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Coupon Timer Component Demo
        </h2>

        {/* Size Variants */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
            Size Variants
          </h3>
          
          <div className="space-y-3">
            <CouponTimer
              couponCode="SMALL10"
              expiresAt={in2Hours}
              discountPercentage={10}
              size="sm"
            />
            
            <CouponTimer
              couponCode="MEDIUM20"
              expiresAt={in1Day}
              discountPercentage={20}
              size="md"
            />
            
            <CouponTimer
              couponCode="LARGE30"
              expiresAt={in5Days}
              discountPercentage={30}
              size="lg"
            />
          </div>
        </div>

        {/* Urgency States */}
        <div className="space-y-4 mt-8">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
            Urgency States
          </h3>
          
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Urgent (expires in 30 minutes):
              </p>
              <CouponTimer
                couponCode="URGENT50"
                expiresAt={in30Minutes}
                discountPercentage={50}
              />
            </div>
            
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Normal (expires in 2 hours):
              </p>
              <CouponTimer
                couponCode="NORMAL25"
                expiresAt={in2Hours}
                discountPercentage={25}
              />
            </div>
          </div>
        </div>

        {/* Variants */}
        <div className="space-y-4 mt-8">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
            Style Variants
          </h3>
          
          <div className="space-y-3">
            <CouponTimer
              couponCode="DEFAULT40"
              expiresAt={in1Day}
              discountPercentage={40}
              variant="default"
            />
            
            <CouponTimer
              couponCode="URGENT60"
              expiresAt={in2Hours}
              discountPercentage={60}
              variant="urgent"
            />
            
            <CouponTimer
              couponCode="MINIMAL15"
              expiresAt={in5Days}
              discountPercentage={15}
              variant="minimal"
            />
          </div>
        </div>

        {/* Coupon List */}
        <div className="space-y-4 mt-8">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
            Multiple Coupons List
          </h3>
          
          <CouponTimerList
            coupons={sampleCoupons}
            onExpired={(id) => console.log(`Coupon ${id} expired`)}
          />
        </div>

        {/* Without Discount Percentage */}
        <div className="space-y-4 mt-8">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
            Without Discount Display
          </h3>
          
          <CouponTimer
            couponCode="NODISCOUNT"
            expiresAt={in2Hours}
          />
        </div>
      </div>
    </div>
  );
};

export default CouponTimerDemo;