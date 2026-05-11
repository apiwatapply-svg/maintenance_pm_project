export type JobRequestMachineOption = {
  id: number;
  machineNo: string;
  name: string;
  location?: string | null;
  zoneId?: number | null;
  zoneName: string;
  typeId?: number | null;
  typeName: string;
  label: string;
};

export type JobRequestChoice = {
  value: string;
  label: string;
};

export type JobRequestOptions = {
  categories: JobRequestChoice[];
  symptoms: JobRequestChoice[];
  machines: JobRequestMachineOption[];
};

export type JobRequestFormData = {
  machineId: string;
  category: string;
  categoryOther: string;
  symptom: string;
  symptomOther: string;
  priority: string;
  productionImpact: boolean;
  machineStopped: boolean;
  ngCount: string;
  description: string;
};

export type JobRequest = {
  id: number;
  requestNo: string;
  status: string;
  priority: string;
  category?: string | null;
  categoryOther?: string | null;
  symptom?: string | null;
  symptomOther?: string | null;
  productionImpact: boolean;
  machineStopped: boolean;
  ngCount?: number | null;
  createdAt: string;
  machineNo?: string | null;
  zone?: string | null;
  machineType?: string | null;
};
