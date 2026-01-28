export interface User {
  id: string;
  employeeId: string; // Added logical ID
  name: string;
  department: string;
  faceImage: string; // Base64
  registeredAt: string;
}

export enum AttendanceType {
  PUNCH_IN = 'PUNCH_IN',
  PUNCH_OUT = 'PUNCH_OUT'
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  timestamp: string;
  type: AttendanceType;
  verificationConfidence: number;
  method: 'FACE_BIO';
}

export interface VerificationResult {
  match: boolean;
  userId?: string;
  confidence: number;
  livenessConfirmed: boolean;
  spoofDetected: boolean;
  reason: string;
}

// Sequential Workflow Steps
export enum WorkflowStep {
  IDLE = 'IDLE',
  SELECT_MODE = 'SELECT_MODE',
  REGISTER_FORM = 'REGISTER_FORM',
  REGISTER_CAPTURE = 'REGISTER_CAPTURE',
  REGISTER_PREVIEW = 'REGISTER_PREVIEW',
  REGISTER_SUCCESS = 'REGISTER_SUCCESS',
  ATTENDANCE_CHALLENGE = 'ATTENDANCE_CHALLENGE',
  ATTENDANCE_CAPTURE = 'ATTENDANCE_CAPTURE',
  PROCESSING = 'PROCESSING',
  RESULT_SUCCESS = 'RESULT_SUCCESS',
  RESULT_FAILURE = 'RESULT_FAILURE',
  HISTORY = 'HISTORY'
}

export enum LivenessAction {
  BLINK = 'Blink your eyes',
  SMILE = 'Smile widely',
  LOOK_LEFT = 'Turn head slightly left',
  LOOK_RIGHT = 'Turn head slightly right',
  OPEN_MOUTH = 'Open your mouth'
}