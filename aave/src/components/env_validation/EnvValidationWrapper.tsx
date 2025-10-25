import React, { useEffect, useState } from 'react';
import { getEnvironmentStatus } from '../../utils/envValidation';
import { EnvErrorModal } from './EnvErrorModal';

interface EnvValidationWrapperProps {
  children: React.ReactNode;
}

export function EnvValidationWrapper({ children }: EnvValidationWrapperProps) {
  const [envStatus, setEnvStatus] = useState<{
    isValid: boolean;
    errors: Array<{ key: string; message: string }>;
  } | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const status = getEnvironmentStatus();
    setEnvStatus(status);
    setShowModal(!status.isValid);
  }, []);

  if (!envStatus) {
    return (
      <div className="min-h-screen bg-black/95 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!envStatus.isValid) {
    return (
      <>
        <div className="min-h-screen bg-black/95 flex items-center justify-center">
          <div className="text-white">Loading...</div>
        </div>
        {showModal && (
          <EnvErrorModal
            errors={envStatus.errors}
            onClose={() => setShowModal(false)}
          />
        )}
      </>
    );
  }

  return <>{children}</>;
}