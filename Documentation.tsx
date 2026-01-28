import React from 'react';

const Documentation: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow-sm rounded-xl space-y-8">
      <header className="border-b pb-4">
        <h1 className="text-3xl font-bold text-gray-900">System Documentation</h1>
        <p className="text-gray-500 mt-2">
          AI-Powered Face Authentication & Attendance System
        </p>
      </header>

      {/* 1. Model and Technical Approach */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-800">
          1. Model and Technical Approach
        </h2>
        <div className="prose text-gray-600">
          <p>
            This system is designed and implemented by me using <strong>VS Code</strong> as
            the development environment and modern web technologies such as
            <strong> TypeScript, JavaScript, Node.js, and React</strong>. The core objective
            is to build an AI-assisted face authentication and attendance system capable of
            performing face verification, liveness detection, and spoof prevention in
            real time.
          </p>

          <p>
            Instead of relying on traditional hard-coded facial embeddings or classical
            classifiers, the system follows a <strong>vision-based analytical approach</strong>,
            where facial images are processed and analyzed holistically. The verification
            logic compares a live camera image with previously registered user images to
            determine identity similarity.
          </p>

          <ul className="list-disc pl-5 space-y-2 mt-3">
            <li>
              <strong>Face Verification:</strong> The system performs 1:N face matching by
              comparing a live image captured during check-in with multiple registered user
              images. Facial structure and relative positioning of key landmarks such as
              eyes, nose, and jawline are analyzed to determine the closest match and
              confidence score.
            </li>
            <li>
              <strong>Liveness Detection:</strong> A challenge–response mechanism is used to
              prevent static image attacks. The user is randomly asked to perform an action
              such as blinking, smiling, or maintaining a neutral expression, which is then
              verified using the captured live image.
            </li>
            <li>
              <strong>Spoof Detection:</strong> Basic spoof prevention logic evaluates visual
              cues that commonly indicate attacks, such as flat textures, screen glare,
              unnatural lighting, or lack of depth typically found in printed photos or
              mobile screen replays.
            </li>
          </ul>
        </div>
      </section>

      {/* 2. Development and Training Process */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-800">
          2. Development and Training Process
        </h2>
        <div className="prose text-gray-600">
          <p>
            This system does not involve manual model training or dataset fine-tuning.
            Instead, it is implemented as a <strong>zero-shot solution</strong>, where
            intelligent decision-making is driven by structured logic and prompt-based
            analysis.
          </p>

          <ul className="list-disc pl-5 space-y-2 mt-3">
            <li>Well-defined verification steps</li>
            <li>Strict validation rules</li>
            <li>Structured JSON-based responses</li>
            <li>
              Custom prompt logic that guides the AI to focus on facial landmarks, liveness
              actions, and spoof indicators
            </li>
          </ul>

          <p className="mt-3">
            The “training” aspect of this project lies in engineering the verification
            workflow and prompts rather than training a model from scratch. This enables
            rapid prototyping and easy iteration without maintaining large datasets.
          </p>
        </div>
      </section>

      {/* 3. Accuracy and Performance */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-800">
          3. Accuracy and Performance Expectations
        </h2>
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
          <ul className="list-disc pl-5 text-blue-700 space-y-1">
            <li>
              <strong>Face Matching Accuracy:</strong> Approximately 90–95% under good
              lighting conditions and frontal face positioning.
            </li>
            <li>
              <strong>Liveness Detection Accuracy:</strong> High for clear actions such as
              smiling or blinking, with reduced accuracy for subtle movements.
            </li>
            <li>
              <strong>Verification Latency:</strong> Typically 1–3 seconds per request,
              depending on system load and network conditions.
            </li>
          </ul>
        </div>
        <p className="text-gray-600">
          These performance levels are suitable for academic projects, demonstrations, and
          prototype-level attendance systems.
        </p>
      </section>

      {/* 4. Known Limitations */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-800">
          4. Known Limitations and Failure Scenarios
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border p-4 rounded-lg">
            <h3 className="font-bold text-red-600">Lighting Conditions</h3>
            <p className="text-sm text-gray-600 mt-1">
              Extreme lighting such as strong backlighting or very low illumination can
              reduce facial clarity and lead to false rejections.
            </p>
          </div>

          <div className="border p-4 rounded-lg">
            <h3 className="font-bold text-red-600">Scalability Constraints</h3>
            <p className="text-sm text-gray-600 mt-1">
              The current implementation evaluates multiple registered faces in a single
              verification request. This works well for small datasets but is not suitable
              for large-scale deployments without an initial filtering mechanism.
            </p>
          </div>

          <div className="border p-4 rounded-lg">
            <h3 className="font-bold text-red-600">Advanced Spoofing</h3>
            <p className="text-sm text-gray-600 mt-1">
              While basic spoofing attempts are detectable, highly realistic deepfake videos
              or advanced display attacks may bypass visual checks without hardware-level
              depth or infrared sensors.
            </p>
          </div>
        </div>
      </section>

      {/* 5. ML Limitations */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-800">
          5. Machine Learning and System Limitations
        </h2>
        <p className="text-gray-600">
          Biometric authentication systems are inherently probabilistic rather than
          deterministic. There is always a trade-off between <strong>False Acceptance Rate
          (FAR)</strong> and <strong>False Rejection Rate (FRR)</strong>. This system is
          designed to prioritize usability and convenience, reducing false rejections while
          allowing a slightly higher false acceptance rate compared to enterprise-grade
          biometric hardware.
        </p>
      </section>
    </div>
  );
};

export default Documentation;
