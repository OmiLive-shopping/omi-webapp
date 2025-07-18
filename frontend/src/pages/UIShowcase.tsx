import React, { useState } from 'react';
import usePageTitle from '@/hooks/usePageTitle';
import { Button, Input, Modal, Loader, Card, CardHeader, CardBody, CardFooter } from '@/components/ui';
import { Home, Mail, Search, ChevronRight } from 'lucide-react';

const UIShowcase: React.FC = () => {
  usePageTitle('UI Components Showcase');
  const [modalOpen, setModalOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [showError, setShowError] = useState(false);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <h1 className="text-4xl font-bold mb-8 text-gray-900 dark:text-white">
        UI Components Showcase
      </h1>

      {/* Buttons Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-6 text-gray-800 dark:text-gray-200">
          Buttons
        </h2>
        
        <Card>
          <CardBody>
            <div className="space-y-6">
              {/* Button Variants */}
              <div>
                <h3 className="text-lg font-medium mb-3 text-gray-700 dark:text-gray-300">
                  Variants
                </h3>
                <div className="flex flex-wrap gap-3">
                  <Button variant="primary">Primary</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="danger">Danger</Button>
                </div>
              </div>

              {/* Button Sizes */}
              <div>
                <h3 className="text-lg font-medium mb-3 text-gray-700 dark:text-gray-300">
                  Sizes
                </h3>
                <div className="flex flex-wrap items-center gap-3">
                  <Button size="xs">Extra Small</Button>
                  <Button size="sm">Small</Button>
                  <Button size="md">Medium</Button>
                  <Button size="lg">Large</Button>
                </div>
              </div>

              {/* Button States */}
              <div>
                <h3 className="text-lg font-medium mb-3 text-gray-700 dark:text-gray-300">
                  States
                </h3>
                <div className="flex flex-wrap gap-3">
                  <Button disabled>Disabled</Button>
                  <Button loading>Loading</Button>
                  <Button fullWidth={false} leftIcon={<Home />}>
                    With Icon
                  </Button>
                  <Button rightIcon={<ChevronRight />}>
                    Continue
                  </Button>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      </section>

      {/* Inputs Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-6 text-gray-800 dark:text-gray-200">
          Inputs
        </h2>
        
        <Card>
          <CardBody>
            <div className="space-y-6 max-w-md">
              <Input
                label="Basic Input"
                placeholder="Enter text..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
              
              <Input
                label="Email"
                type="email"
                placeholder="john@example.com"
                leftIcon={<Mail />}
                required
              />
              
              <Input
                label="Password"
                type="password"
                placeholder="Enter password"
                helpText="Must be at least 8 characters"
              />
              
              <Input
                label="Search"
                placeholder="Search..."
                rightIcon={<Search />}
                inputSize="lg"
              />
              
              <Input
                label="With Error"
                placeholder="Enter value"
                error={showError ? "This field is required" : undefined}
                value=""
                onChange={() => setShowError(false)}
                onBlur={() => setShowError(true)}
              />
              
              <Input
                label="Disabled Input"
                placeholder="Cannot edit"
                disabled
              />
            </div>
          </CardBody>
        </Card>
      </section>

      {/* Loaders Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-6 text-gray-800 dark:text-gray-200">
          Loaders
        </h2>
        
        <Card>
          <CardBody>
            <div className="space-y-6">
              {/* Spinner Loaders */}
              <div>
                <h3 className="text-lg font-medium mb-3 text-gray-700 dark:text-gray-300">
                  Spinner
                </h3>
                <div className="flex items-center gap-4">
                  <Loader size="xs" />
                  <Loader size="sm" />
                  <Loader size="md" />
                  <Loader size="lg" />
                  <Loader size="xl" />
                </div>
              </div>

              {/* Dots Loaders */}
              <div>
                <h3 className="text-lg font-medium mb-3 text-gray-700 dark:text-gray-300">
                  Dots
                </h3>
                <div className="flex items-center gap-4">
                  <Loader variant="dots" size="xs" />
                  <Loader variant="dots" size="sm" />
                  <Loader variant="dots" size="md" />
                  <Loader variant="dots" size="lg" />
                  <Loader variant="dots" size="xl" />
                </div>
              </div>

              {/* Pulse Loaders */}
              <div>
                <h3 className="text-lg font-medium mb-3 text-gray-700 dark:text-gray-300">
                  Pulse
                </h3>
                <div className="flex items-center gap-4">
                  <Loader variant="pulse" size="xs" />
                  <Loader variant="pulse" size="sm" />
                  <Loader variant="pulse" size="md" />
                  <Loader variant="pulse" size="lg" />
                  <Loader variant="pulse" size="xl" />
                </div>
              </div>

              {/* Colors */}
              <div>
                <h3 className="text-lg font-medium mb-3 text-gray-700 dark:text-gray-300">
                  Colors
                </h3>
                <div className="flex items-center gap-4">
                  <Loader color="primary" />
                  <Loader color="secondary" />
                  <div className="bg-gray-800 p-2 rounded">
                    <Loader color="white" />
                  </div>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      </section>

      {/* Cards Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-6 text-gray-800 dark:text-gray-200">
          Cards
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Basic Card</h3>
            </CardHeader>
            <CardBody>
              <p className="text-gray-600 dark:text-gray-400">
                This is a basic card with header, body, and footer sections.
              </p>
            </CardBody>
            <CardFooter>
              <Button size="sm">Action</Button>
            </CardFooter>
          </Card>

          <Card hover onClick={() => alert('Card clicked!')}>
            <CardBody>
              <h3 className="text-lg font-semibold mb-2">Clickable Card</h3>
              <p className="text-gray-600 dark:text-gray-400">
                This card has hover effects and is clickable.
              </p>
            </CardBody>
          </Card>

          <Card shadow="lg" padding="lg">
            <h3 className="text-lg font-semibold mb-2">Large Shadow Card</h3>
            <p className="text-gray-600 dark:text-gray-400">
              This card has a large shadow and padding.
            </p>
          </Card>

          <Card shadow="none" className="border-2 border-primary-500">
            <CardBody>
              <h3 className="text-lg font-semibold mb-2">Custom Styled Card</h3>
              <p className="text-gray-600 dark:text-gray-400">
                This card has custom styling applied.
              </p>
            </CardBody>
          </Card>
        </div>
      </section>

      {/* Modal Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-6 text-gray-800 dark:text-gray-200">
          Modals
        </h2>
        
        <Card>
          <CardBody>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => setModalOpen(true)}>
                Open Modal
              </Button>
              
              <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title="Example Modal"
                size="md"
              >
                <div className="space-y-4">
                  <p className="text-gray-600 dark:text-gray-400">
                    This is an example modal with various features including:
                  </p>
                  <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-1">
                    <li>Customizable sizes (sm, md, lg, xl, full)</li>
                    <li>Click outside to close</li>
                    <li>ESC key to close</li>
                    <li>Focus management</li>
                    <li>Prevents body scroll when open</li>
                  </ul>
                  <div className="flex gap-3 pt-4">
                    <Button onClick={() => setModalOpen(false)}>
                      Close
                    </Button>
                    <Button variant="secondary" onClick={() => setModalOpen(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </Modal>
            </div>
          </CardBody>
        </Card>
      </section>
    </div>
  );
};

export default UIShowcase;