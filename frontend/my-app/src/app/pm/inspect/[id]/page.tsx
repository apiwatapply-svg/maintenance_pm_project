"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import config from "../../../config";
import axios from "axios";
import Swal from 'sweetalert2';
import { useAuth } from "../../../../context/AuthContext";

// [NEW] Camera Modal Component
const CameraModal = ({ isOpen, onClose, onCapture }: { isOpen: boolean, onClose: () => void, onCapture: (imageSrc: string) => void }) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      Swal.fire("Error", "Cannot access camera. Please check permissions.", "error");
      onClose();
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const capture = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const imageSrc = canvas.toDataURL("image/jpeg");
        onCapture(imageSrc);
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Take Photo</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body text-center p-0 bg-dark">
            <video ref={videoRef} autoPlay playsInline style={{ width: '100%', maxHeight: '60vh' }}></video>
          </div>
          <div className="modal-footer justify-content-center">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="button" className="btn btn-primary btn-lg" onClick={capture}>
              <i className="bi bi-camera-fill me-2"></i>Capture
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface Checklist {
  id: number;
  topic: string;
  type: string;
  minVal?: number;
  maxVal?: number;
  image?: string;
  options?: string; // JSON string
  isRequired?: boolean;
  isActive?: boolean;
}

interface Machine {
  id: number;
  code: string;
  name: string;
  model: string;
  location: string;
  checklists: Checklist[];
  pmPlans?: {
    id: number;
    preventiveTypeId: number;
    preventiveType: {
      name: string;
      image?: string;
      masterChecklists: Checklist[];
    };
    nextPMDate?: string;
    frequencyDays: number;
  }[];
}

interface PMRecord {
  id: number;
  date: string;
  dueDate?: string;
  inspector: string;
  checker: string;
  status: string;
  remark: string;
  machine: Machine;
  details: {
    id: number;
    checklistId: number;
    isPass: boolean;
    value: string;
    remark: string;
    checklist: Checklist;
    image?: string;
    imageBefore?: string;
    imageAfter?: string;
  }[];
}

export default function InspectionForm() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode');
  const isViewMode = mode === 'view';
  const isEditMode = mode === 'edit';

  const [machine, setMachine] = useState<Machine | null>(null);
  const [pmRecord, setPmRecord] = useState<PMRecord | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [formData, setFormData] = useState<{
    inspector: string;
    checker: string;
    remark: string;
    details: { checklistId: number; isPass: boolean; value: string; remark: string; image?: string; imageBefore?: string; imageAfter?: string }[];
    subItemDetails?: { [key: string]: { checklistId: number; topic?: string; subItemName: string; isPass?: boolean; value?: string; remark?: string } };
  }>({
    inspector: "",
    checker: "",
    remark: "",
    details: [],
    subItemDetails: {}
  });

  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);
  const [currentPlan, setCurrentPlan] = useState<any>(null);
  const [editDate, setEditDate] = useState<string>("");

  // [NEW] Camera State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraTarget, setCameraTarget] = useState<{ index: number, type: 'before' | 'after', position: string } | null>(null);

  // [NEW] Last PM Values - ค่าที่บันทึกครั้งล่าสุด
  const [lastPMValues, setLastPMValues] = useState<{ [key: string]: string }>({});
  const [lastPMDate, setLastPMDate] = useState<string | null>(null);

  // [NEW] Additional Details defaults from database
  const [additionalDefaults, setAdditionalDefaults] = useState<any[]>([]);

  const { loading, user: authUser } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (params.id) {
      if (isViewMode || isEditMode) {
        // View/Edit mode: fetch PM record
        fetchPMRecord(params.id as string);
        if (isEditMode) {
          fetchUsers();
        }
      } else {
        // New PM mode: fetch machine
        // New PM mode: fetch machine
        fetchMachine(params.id as string);
        fetchUsers(params.id as string);
      }
    }
  }, [params.id, isViewMode, isEditMode, loading]);

  useEffect(() => {
    if (!isViewMode && !isEditMode) {
      const savedInspector = localStorage.getItem('lastInspector');
      const savedChecker = localStorage.getItem('lastChecker');
      if (savedInspector || savedChecker) {
        setFormData(prev => ({
          ...prev,
          inspector: savedInspector || prev.inspector,
          checker: savedChecker || prev.checker
        }));
      }
    }
  }, [isViewMode, isEditMode]);

  const fetchUsers = (machineId?: string) => {
    let url = `${config.apiServer}/api/user-master`;
    if (machineId) {
      url += `?machineId=${machineId}`;
    }
    axios.get(url)
      .then(res => setUsers(res.data))
      .catch(err => console.error(err));
  };

  const fetchPMRecord = (id: string) => {
    axios.get(`${config.apiServer}/api/pm/records/${id}`)
      .then((res) => {
        const record = res.data;
        setPmRecord(record);
        setPmRecord(record);
        setMachine(record.machine);

        // Fetch users for this machine (Edit/View mode)
        if (isEditMode) {
          fetchUsers(record.machine.id.toString());
        }

        // [FIX] Set selectedTypeId from record
        if (record.preventiveTypeId) {
          setSelectedTypeId(record.preventiveTypeId);
        }

        // [FIX] Restore missing masterChecklists from historic details (if they were deleted from current master plan)
        const currentMasterChecklists = record.preventiveType?.masterChecklists || record.machine?.checklists || [];
        const historicChecklists = record.details
          .filter((d: any) => !d.subItemName && d.masterChecklist && !currentMasterChecklists.some((mc: any) => mc.id === d.checklistId))
          .map((d: any) => d.masterChecklist);

        if (historicChecklists.length > 0) {
          if (record.preventiveType && record.preventiveType.masterChecklists) {
            record.preventiveType.masterChecklists = [...record.preventiveType.masterChecklists, ...historicChecklists];
          } else if (record.machine && record.machine.checklists) {
            record.machine.checklists = [...record.machine.checklists, ...historicChecklists];
          }
        }

        // Now setup current plan for Checklist items rendering
        if (record.preventiveType) {
          setCurrentPlan({ preventiveType: record.preventiveType });
        } else if (record.preventiveTypeId && record.machine.pmPlans) {
          const plan = record.machine.pmPlans.find((p: any) => p.preventiveTypeId === record.preventiveTypeId);
          if (plan) setCurrentPlan(plan);
        }

        // [FIX] Extract subItemDetails from record.details that have subItemName
        const restoredSubItemDetails: any = {};
        // Use Map instead of flat array to avoid index mismatch
        const standardDetailsMap = new Map<number, any>();

        record.details.forEach((d: any) => {
          if (d.subItemName) {
            // [FIX] Use subItemName directly as key — name-based mapping is stable and avoids index mismatch
            const masterChecklist = (record.preventiveType?.masterChecklists || record.machine?.checklists || []).find(
              (mc: any) => mc.id === d.checklistId
            );

            // Ensure historic sub-item is available in the options (for rendering)
            if (masterChecklist?.options) {
              try {
                const opts = JSON.parse(masterChecklist.options);
                if (opts.subItems && Array.isArray(opts.subItems)) {
                  const alreadyExists = opts.subItems.some(
                    (si: any) => (typeof si === 'string' ? si : si.name) === d.subItemName
                  );
                  if (!alreadyExists) {
                    opts.subItems.push(d.subItemName);
                    masterChecklist.options = JSON.stringify(opts);
                  }
                }
              } catch { /* ignore parse errors */ }
            }

            // [FIX] Key = checklistId + subItemName (NOT index) — immune to array reordering
            const key = `${d.checklistId}_${d.subItemName}`;
            restoredSubItemDetails[key] = {
              checklistId: d.checklistId,
              topic: masterChecklist?.topic || '',
              subItemName: d.subItemName,
              isPass: d.isPass,
              value: d.value || ""
            };
          } else {
            // [FIX] Store by checklistId instead of pushing to flat array
            standardDetailsMap.set(d.checklistId, {
              checklistId: d.checklistId,
              isPass: d.isPass,
              value: d.value || "",
              remark: d.remark || "",
              image: d.image || "",
              imageBefore: d.imageBefore || "",
              imageAfter: d.imageAfter || ""
            });
          }
        });

        // [FIX] Build alignedDetails that maps 1:1 with masterChecklists (= checklists array in render)
        const allMasterChecklists = record.preventiveType?.masterChecklists
          || record.machine?.checklists || [];
        const alignedDetails = allMasterChecklists.map((mc: any) => {
          const existing = standardDetailsMap.get(mc.id);
          return existing || {
            checklistId: mc.id,
            isPass: mc.type !== 'NUMERIC',
            value: "",
            remark: "",
            image: "",
            imageBefore: "",
            imageAfter: ""
          };
        });

        // Populate form data with existing values
        setFormData({
          inspector: record.inspector,
          checker: record.checker,
          remark: record.remark,
          details: alignedDetails,
          subItemDetails: restoredSubItemDetails
        } as any);

        // [NEW] Set edit date from record
        if (record.date) {
          const d = new Date(record.date);
          const formatted = d.getFullYear() + '-' +
            String(d.getMonth() + 1).padStart(2, '0') + '-' +
            String(d.getDate()).padStart(2, '0') + 'T' +
            String(d.getHours()).padStart(2, '0') + ':' +
            String(d.getMinutes()).padStart(2, '0');
          setEditDate(formatted);
        }
      })
      .catch((err) => console.error(err));
  };

  const fetchMachine = (id: string) => {
    const typeIdParam = searchParams.get('typeId');
    const url = typeIdParam
      ? `${config.apiServer}/api/machines/${id}?typeId=${typeIdParam}`
      : `${config.apiServer}/api/machines/${id}`;

    axios.get(url)
      .then(async (res) => {
        const data = res.data;
        setMachine(data);

        // [NEW] Store last PM values and date
        setLastPMValues(data.lastPMValues || {});
        setLastPMDate(data.lastPMDate || null);

        let targetPlan: any = null;
        let sourceChecklists: Checklist[] = [];

        // 1. Check if typeId query param exists
        const typeIdParam = searchParams.get('typeId');

        if (data.pmPlans && data.pmPlans.length > 0) {
          if (typeIdParam) {
            targetPlan = data.pmPlans.find((p: any) => p.preventiveTypeId === parseInt(typeIdParam));
          } else if (data.pmPlans.length === 1) {
            // Auto-select the only plan
            targetPlan = data.pmPlans[0];
          } else {
            // Ambiguous: Multiple plans, no param. Prompt user.
            const options: any = {};
            data.pmPlans.forEach((p: any) => {
              options[p.preventiveTypeId] = p.preventiveType.name;
            });

            // [FIX] Set default value to first PM Type
            const firstTypeId = data.pmPlans[0].preventiveTypeId.toString();

            const { value: selectedType } = await Swal.fire({
              title: 'Select PM Type',
              input: 'select',
              inputOptions: options,
              inputValue: firstTypeId, // [FIX] Default to first PM Type
              inputPlaceholder: 'Select a PM Type',
              showCancelButton: false,
              allowOutsideClick: false,
              confirmButtonText: 'Continue'
            });

            if (selectedType) {
              targetPlan = data.pmPlans.find((p: any) => p.preventiveTypeId === parseInt(selectedType));
            } else {
              // [FIX] Fallback to first PM Type if nothing selected
              targetPlan = data.pmPlans[0];
            }
          }
        }

        if (targetPlan) {
          setSelectedTypeId(targetPlan.preventiveTypeId);
          setCurrentPlan(targetPlan);
          sourceChecklists = targetPlan.preventiveType.masterChecklists || [];
          // Filter out inactive items
          sourceChecklists = sourceChecklists.filter(c => c.isActive !== false);
        } else {
          // Fallback to legacy/ad-hoc checklists if no plan selected
          sourceChecklists = data.checklists || [];
          // Filter out inactive items (if applicable for legacy)
          sourceChecklists = sourceChecklists.filter(c => c.isActive !== false);
        }

        // Initialize details
        if (sourceChecklists.length > 0) {
          const initialDetails = sourceChecklists.map((c: Checklist) => ({
            checklistId: c.id,
            isPass: c.type !== 'NUMERIC', // Default pass except numeric
            value: "",
            remark: "",
            image: "",
            imageBefore: "",
            imageAfter: ""
          }));

          // [FIX] Initialize subItemDetails for all checklists with subItems (name-based keys)
          const initialSubItemDetails: any = {};
          sourceChecklists.forEach((c: any) => {
            if (c.options) {
              try {
                const opts = JSON.parse(c.options);
                if (opts.subItems && Array.isArray(opts.subItems)) {
                  opts.subItems.forEach((subItem: any) => {
                    // [FIX] Extract name regardless of string or object format
                    const subItemName = typeof subItem === 'string' ? subItem : subItem.name;
                    const key = `${c.id}_${subItemName}`; // [FIX] Name-based key — consistent with restore logic
                    initialSubItemDetails[key] = {
                      checklistId: c.id,
                      topic: c.topic,
                      subItemName: subItemName,
                      isPass: c.type !== 'NUMERIC', // Default OK for BOOLEAN
                      value: ""
                    };
                  });
                }
              } catch { /* ignore parse errors */ }
            }
          });

          setFormData((prev) => ({ ...prev, details: initialDetails, subItemDetails: initialSubItemDetails } as any));
        }
      })
      .catch((err) => console.error(err));
  };

  // [NEW] Fetch additional defaults from database when machine/plan changes
  useEffect(() => {
    if (!isViewMode && !isEditMode && machine && selectedTypeId) {
      axios.get(`${config.apiServer}/api/additional-defaults/${machine.id}/${selectedTypeId}`)
        .then(res => {
          setAdditionalDefaults(res.data || []);
        })
        .catch(err => {
          console.error('Failed to fetch additional defaults:', err);
          setAdditionalDefaults([]);
        });
    }
  }, [machine?.id, selectedTypeId, isViewMode, isEditMode]);

  const handleImageUpload = (index: number, field: 'imageBefore' | 'imageAfter', position: string, file: File) => {
    if (!file) return;

    // Upload to server first
    const uploadData = new FormData();
    uploadData.append('image', file);

    axios.post(`${config.apiServer}/api/upload`, uploadData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(res => {
      const imageUrl = `${config.apiServer}${res.data.path}`;
      updateImageField(index, field, position, imageUrl);
    }).catch(err => {
      console.error("Upload failed", err);
      Swal.fire("Error", "Failed to upload image", "error");
    });
  };

  const updateImageField = (index: number, field: 'imageBefore' | 'imageAfter', position: string, imageUrl: string) => {
    const newDetails = [...formData.details];
    const currentDetail = newDetails[index];

    // Parse existing JSON or create new array
    let images: { label: string, url: string }[] = [];
    try {
      const raw = currentDetail[field];
      if (raw && raw.startsWith('[')) {
        images = JSON.parse(raw);
      } else if (raw) {
        // Legacy: single string
        images = [{ label: 'Default', url: raw }];
      }
    } catch {
      images = [];
    }

    // Update or Add
    const existingIdx = images.findIndex(img => img.label === position);
    if (existingIdx >= 0) {
      images[existingIdx].url = imageUrl;
    } else {
      images.push({ label: position, url: imageUrl });
    }

    newDetails[index] = { ...currentDetail, [field]: JSON.stringify(images) };
    setFormData({ ...formData, details: newDetails });
  };

  const openCamera = (index: number, type: 'before' | 'after', position: string) => {
    setCameraTarget({ index, type, position });
    setIsCameraOpen(true);
  };

  const handleCameraCapture = (imageSrc: string) => {
    if (cameraTarget) {
      // Convert Base64 to Blob and upload (or save base64 directly? Better upload for size)
      // For simplicity/speed, let's upload base64 as file
      fetch(imageSrc)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], `camera_${Date.now()}.jpg`, { type: "image/jpeg" });

          const uploadData = new FormData();
          uploadData.append('image', file);

          axios.post(`${config.apiServer}/api/upload`, uploadData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          }).then(res => {
            const imageUrl = `${config.apiServer}${res.data.path}`;
            updateImageField(cameraTarget.index, cameraTarget.type === 'before' ? 'imageBefore' : 'imageAfter', cameraTarget.position, imageUrl);
          }).catch(err => console.error(err));
        });
    }
  };

  const resolveMinMax = (checklist: Checklist, currentDetails: any[]) => {
    let min = checklist.minVal;
    let max = checklist.maxVal;

    if (checklist.type === 'NUMERIC' && checklist.options) {
      try {
        const parsed = JSON.parse(checklist.options);
        if (parsed.parentId && parsed.conditions) {
          const parentDetail = currentDetails.find(d => String(d.checklistId) === String(parsed.parentId));
          if (parentDetail && parentDetail.value) {
            const condition = parsed.conditions[parentDetail.value];
            if (condition) {
              if (condition.min !== undefined && condition.min !== "") min = parseFloat(condition.min);
              if (condition.max !== undefined && condition.max !== "") max = parseFloat(condition.max);
            }
          }
        }
      } catch (e) {
        // Ignore parse error
      }
    }
    return { min, max };
  };

  // [NEW] Build dropdownKey from all DROPDOWN values in detailChecklists
  const buildDropdownKey = (details: any[], detailChecklists: any[]) => {
    const dropdowns: { [checklistId: string]: string } = {};
    detailChecklists.forEach((item: any) => {
      if (item.type === 'DROPDOWN') {
        const globalIndex = checklists.findIndex((c: any) => c.id === item.id);
        const value = details[globalIndex]?.value || '';
        if (value) {
          dropdowns[item.id.toString()] = value;
        }
      }
    });
    const sortedKeys = Object.keys(dropdowns).sort();
    const result: { [key: string]: string } = {};
    sortedKeys.forEach(k => { result[k] = dropdowns[k]; });
    return JSON.stringify(result);
  };

  // [NEW] Apply additional defaults (auto-fill TEXT fields based on dropdownKey)
  const applyAdditionalDefaults = (currentDetails: any[], defaults: any[], detailChecklists: any[]) => {
    const currentDropdownKey = buildDropdownKey(currentDetails, detailChecklists);
    const newDetails = [...currentDetails];
    let changed = false;

    detailChecklists.forEach((item: any) => {
      if (item.type === 'TEXT') {
        const globalIndex = checklists.findIndex((c: any) => c.id === item.id);
        const matchingDefault = defaults.find(
          (d: any) => d.dropdownKey === currentDropdownKey && d.textChecklistId === item.id
        );
        if (matchingDefault && newDetails[globalIndex]) {
          if (newDetails[globalIndex].value !== matchingDefault.textValue) {
            newDetails[globalIndex] = { ...newDetails[globalIndex], value: matchingDefault.textValue };
            changed = true;
          }
        }
      }
    });

    return changed ? newDetails : null;
  };

  const handleDetailChange = (index: number, field: string, value: any) => {
    const newDetails = [...formData.details];
    newDetails[index] = { ...newDetails[index], [field]: value };

    // Determine which checklists we are using (Must match render logic)
    const rawChecklists = currentPlan?.preventiveType?.masterChecklists || machine?.checklists || [];
    const currentChecklists = rawChecklists.filter((c: any) => c.isActive !== false);
    const currentChecklist = currentChecklists[index];

    // Re-validate all Numeric items
    newDetails.forEach((d, idx) => {
      const checklist = currentChecklists[idx];
      if (checklist?.type === 'NUMERIC') {
        const val = parseFloat(d.value);
        const { min, max } = resolveMinMax(checklist, newDetails);
        if (!isNaN(val) && min !== undefined && max !== undefined) {
          d.isPass = val >= min && val <= max;
        }
      }
      // [NEW] Validate DROPDOWN with spec range against checklist minVal/maxVal
      if (checklist?.type === 'DROPDOWN' && d.value) {
        const opts = safeParseOptions(checklist.options);
        const allOptions = opts.options || (Array.isArray(opts) ? opts : []);
        const selectedOpt = allOptions.find((o: any) => (typeof o === 'string' ? o : o.label) === d.value);
        if (selectedOpt && typeof selectedOpt !== 'string' && selectedOpt.spec && typeof selectedOpt.spec === 'string') {
          const specParts = selectedOpt.spec.split('-').map((s: string) => parseFloat(s.trim()));
          if (specParts.length === 2 && !isNaN(specParts[0]) && !isNaN(specParts[1])) {
            const specMin = specParts[0];
            const specMax = specParts[1];
            if (checklist.minVal !== null && checklist.minVal !== undefined && checklist.maxVal !== null && checklist.maxVal !== undefined) {
              d.isPass = specMin >= checklist.minVal && specMax <= checklist.maxVal;
            }
          }
        }
      }
    });

    let newSubItemDetails = { ...(formData.subItemDetails as any || {}) };
    let subItemsChanged = false;

    // [FIX] Re-validate sub-items
    Object.keys(newSubItemDetails).forEach(key => {
      const sub = newSubItemDetails[key];
      const cl = currentChecklists.find((c: any) => c.id === sub.checklistId);
      if (cl && cl.type === 'NUMERIC' && sub.value) {
        let siMin, siMax;
        try {
          const opts = cl.options ? JSON.parse(cl.options) : {};
          if (opts.subItems) {
            const matchingSi = opts.subItems.find((s: any) => (typeof s === 'string' ? s : s.name) === sub.subItemName);
            if (matchingSi && typeof matchingSi !== 'string') {
              siMin = matchingSi.min;
              siMax = matchingSi.max;
            }
          }
        } catch { }

        const { min: resolvedMin, max: resolvedMax } = resolveMinMax(cl, newDetails);
        const effMin = siMin ?? resolvedMin;
        const effMax = siMax ?? resolvedMax;

        const val = parseFloat(sub.value);
        if (!isNaN(val) && effMin !== undefined && effMax !== undefined && effMin !== null && effMax !== null) {
          const newIsPass = val >= effMin && val <= effMax;
          if (sub.isPass !== newIsPass) {
            newSubItemDetails[key] = { ...sub, isPass: newIsPass };
            subItemsChanged = true;
          }
        }
      }
    });

    // [NEW] Auto-fill TEXT fields when DROPDOWN changes
    if (!isViewMode && !isEditMode && field === 'value' && currentChecklist?.type === 'DROPDOWN') {
      const opts = safeParseOptions(currentChecklist.options);
      const hasSubItems = opts.subItems && opts.subItems.length > 0;
      if (!hasSubItems) {
        const detailChks = checklists.filter((c: any) => {
          const o = safeParseOptions(c.options);
          const hasSub = o.subItems && o.subItems.length > 0;
          return (c.type === 'TEXT' || c.type === 'DROPDOWN') && !hasSub;
        });
        const filledDetails = applyAdditionalDefaults(newDetails, additionalDefaults, detailChks);
        if (filledDetails) {
          setFormData({ ...formData, details: filledDetails, ...(subItemsChanged ? { subItemDetails: newSubItemDetails } : {}) } as any);
          return;
        }
      }
    }

    setFormData({ ...formData, details: newDetails, ...(subItemsChanged ? { subItemDetails: newSubItemDetails } : {}) } as any);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation: Check 'isRequired' fields
    // Validation: Check 'isRequired' fields
    const rawChecklists = currentPlan?.preventiveType?.masterChecklists || machine?.checklists || [];
    const currentChecklists = rawChecklists.filter((c: any) => c.isActive !== false);
    const missingFields: string[] = [];

    currentChecklists.forEach((checklist: any, index: number) => {
      // [FIX] Skip sub-item checklists - they are validated via subItemDetails, not details[]
      try {
        const opts = checklist.options ? JSON.parse(checklist.options) : {};
        if (opts.subItems && opts.subItems.length > 0) return;
      } catch { /* ignore */ }

      if (checklist.isRequired) {
        const detail = formData.details[index];
        if (!detail) {
          missingFields.push(checklist.topic);
          return;
        }

        if (checklist.type === 'BOOLEAN') {
          if (detail.isPass === undefined || detail.isPass === null) {
            missingFields.push(checklist.topic);
          }
        } else if (checklist.type === 'IMAGE') {
          // Check if at least one image exists for Before (if configured)
          // Actually, if required, maybe ALL configured positions are required?
          // Let's assume if "Required", at least one image in Before is needed.
          if ((!detail.imageBefore || detail.imageBefore === "[]") && (!detail.imageAfter || detail.imageAfter === "[]")) {
            missingFields.push(checklist.topic + " (Image Required)");
          }
        } else {
          // NUMERIC, TEXT, DROPDOWN use value
          if (!detail.value || detail.value.toString().trim() === "") {
            missingFields.push(checklist.topic);
          }
        }
      }
    });

    if (missingFields.length > 0) {
      Swal.fire({
        title: 'Missing Required Fields',
        html: `Please fill in the following required fields:<br/><ul class="text-start mt-2"><li>${missingFields.join('</li><li>')}</li></ul>`,
        icon: 'error'
      });
      return;
    }

    Swal.fire({
      title: isEditMode ? 'Confirm Update' : 'Confirm Submission',
      text: isEditMode ? "Are you sure you want to update this inspection result?" : "Are you sure you want to submit this inspection result?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: isEditMode ? 'Yes, update it!' : 'Yes, submit it!'
    }).then((result) => {
      if (result.isConfirmed) {
        const allPass = formData.details.every(d => d.isPass);

        let status = "COMPLETED";
        let targetDueDate: Date | null = null;

        if (isEditMode && pmRecord?.dueDate) {
          targetDueDate = new Date(pmRecord.dueDate);
        } else if (!isEditMode && currentPlan?.nextPMDate) {
          targetDueDate = new Date(currentPlan.nextPMDate);
        }

        if (targetDueDate) {
          const compareDate = (isEditMode && editDate) ? new Date(editDate) : new Date();
          compareDate.setHours(0, 0, 0, 0);
          targetDueDate.setHours(0, 0, 0, 0);

          if (compareDate > targetDueDate) {
            status = "LATE";
          }
        } else if (isEditMode && pmRecord) {
          status = pmRecord.status || "COMPLETED";
        }

        const payload = {
          machineId: machine?.id,
          inspector: formData.inspector,
          checker: formData.checker,
          status: status,
          remark: formData.remark,
          ...(isEditMode && editDate ? { date: new Date(editDate).toISOString() } : {}),
          details: formData.details
            .filter((d, index) => {
              // [FIX] Exclude sub-item checklists from standard details (they are sent via subItemDetails)
              const cl = currentChecklists[index];
              if (!cl) return true;
              try {
                const opts = cl.options ? JSON.parse(cl.options) : {};
                return !(opts.subItems && opts.subItems.length > 0);
              } catch { return true; }
            })
            .map((d) => {
              // Find the matching checklist by checklistId for correct topic
              const cl = currentChecklists.find((c: any) => c.id === d.checklistId);
              return {
                ...d,
                topic: cl?.topic || "",
                checklistId: d.checklistId
              };
            }),
          preventiveTypeId: selectedTypeId, // Include selected type
          subItemDetails: (formData as any).subItemDetails || {} // [FIX] Include sub-item details
        };

        const apiCall = isEditMode
          ? axios.put(`${config.apiServer}/api/pm/records/${params.id}`, payload)
          : axios.post(`${config.apiServer}/api/pm/record`, payload);

        apiCall
          .then((res) => {
            // [NEW] Save additional defaults to database
            if (!isViewMode && !isEditMode && machine && selectedTypeId) {
              const rawChks = currentPlan?.preventiveType?.masterChecklists || machine?.checklists || [];
              const activeChks = rawChks.filter((c: any) => c.isActive !== false);
              const detailChks = activeChks.filter((c: any) => {
                try {
                  const opts = JSON.parse(c.options || '{}');
                  const hasSub = opts.subItems && opts.subItems.length > 0;
                  return (c.type === 'TEXT' || c.type === 'DROPDOWN') && !hasSub;
                } catch { return false; }
              });

              const dropdowns: { [key: string]: string } = {};
              detailChks.forEach((item: any) => {
                if (item.type === 'DROPDOWN') {
                  const idx = activeChks.findIndex((c: any) => c.id === item.id);
                  const val = formData.details[idx]?.value || '';
                  if (val) dropdowns[item.id.toString()] = val;
                }
              });
              const sortedKeys = Object.keys(dropdowns).sort();
              const result: { [key: string]: string } = {};
              sortedKeys.forEach(k => { result[k] = dropdowns[k]; });
              const dropdownKey = JSON.stringify(result);

              const textDefaults: { textChecklistId: number; textValue: string }[] = [];
              detailChks.forEach((item: any) => {
                if (item.type === 'TEXT') {
                  const idx = activeChks.findIndex((c: any) => c.id === item.id);
                  const val = formData.details[idx]?.value || '';
                  if (val) {
                    textDefaults.push({ textChecklistId: item.id, textValue: val });
                  }
                }
              });

              if (textDefaults.length > 0) {
                axios.post(`${config.apiServer}/api/additional-defaults`, {
                  machineId: machine.id,
                  preventiveTypeId: selectedTypeId,
                  dropdownKey,
                  textDefaults
                }).catch(err => console.error('Failed to save additional defaults:', err));
              }
            }

            Swal.fire({
              title: isEditMode ? 'Updated!' : 'Submitted!',
              text: isEditMode ? 'PM Record has been updated.' : 'PM Record has been saved.',
              icon: 'success',
              timer: 300,
              showConfirmButton: false
            }).then(() => {
              router.push(searchParams.get('returnTo') || "/");
            });
          })
          .catch((err: any) => {
            console.error(err);
            const errorMsg = err.response?.data?.error || (isEditMode ? 'Failed to update record.' : 'Failed to save record.');
            Swal.fire(
              'Error!',
              errorMsg,
              'error'
            );
          });
      }
    });
  };

  if (!machine) return <div className="text-center py-5"><div className="spinner-border text-primary" role="status"><span className="visually-hidden">Loading...</span></div></div>;

  const inspectors = users.filter(u => u.role === 'INSPECTOR' || u.role === 'BOTH');
  const checkers = users.filter(u => u.role === 'CHECKER' || u.role === 'BOTH');

  // [FIX] Filter out inactive items for rendering to match formData.details
  // But in View/Edit mode, we should show ALL items (even inactive) to preserve history
  const rawChecklists = currentPlan?.preventiveType?.masterChecklists || machine.checklists || [];
  const checklists = rawChecklists.filter((c: any) => {
    if (isViewMode || isEditMode) return true; // Show all in View/Edit
    return c.isActive !== false; // Hide inactive in New Mode
  });

  // Filter checklists based on type

  // [NEW] Helper to safely parse options JSON (moved before filters)
  const safeParseOptions = (optionsStr?: string) => {
    try {
      return optionsStr ? JSON.parse(optionsStr) : {};
    } catch {
      return {};
    }
  };

  // [NEW] Helper to parse dropdown options from checklist.options (exclude subItems)
  const parseDropdownOptions = (optionsStr?: string): { label: string; spec?: string }[] => {
    if (!optionsStr) return [];
    try {
      const parsed = JSON.parse(optionsStr);
      // New format: { options: [{label, spec}], subItems?: [...] }
      if (parsed.options && Array.isArray(parsed.options)) {
        return parsed.options.filter((opt: any) => opt.label);
      }
      // Legacy Array format [{ label, spec }]
      if (Array.isArray(parsed)) {
        return parsed.filter((opt: any) => opt.label);
      }
      // Object format with numbered keys { "0": {label, spec}, "1": {...} }
      const options: { label: string; spec?: string }[] = [];
      for (const key in parsed) {
        if (key !== 'subItems' && key !== 'options' && parsed[key]?.label) {
          options.push(parsed[key]);
        }
      }
      return options;
    } catch {
      return [];
    }
  };

  const imageChecklists = checklists.filter((c: any) => c.type === 'IMAGE');
  const standardChecklists = checklists.filter((c: any) => {
    // Only show items WITHOUT subItems in standard table
    const opts = safeParseOptions(c.options);
    const hasSubItems = opts.subItems && opts.subItems.length > 0;
    return (c.type === 'BOOLEAN' || c.type === 'NUMERIC') && !hasSubItems;
  });
  // [FIX] Only show TEXT/DROPDOWN that DO NOT have subItems in Additional Details
  const detailChecklists = checklists.filter((c: any) => {
    const opts = safeParseOptions(c.options);
    const hasSubItems = opts.subItems && opts.subItems.length > 0;
    return (c.type === 'TEXT' || c.type === 'DROPDOWN') && !hasSubItems;
  });

  // [NEW] Filter Sub-Item checklists (items WITH subItems)
  const subItemChecklists = checklists.filter((c: any) => {
    const opts = safeParseOptions(c.options);
    return opts.subItems && opts.subItems.length > 0;
  });

  // Split standard checklists for 2-col layout
  const midPoint = Math.ceil(standardChecklists.length / 2);
  const leftChecklists = standardChecklists.slice(0, midPoint);
  const rightChecklists = standardChecklists.slice(midPoint);

  const getGlobalIndex = (item: Checklist) => checklists.findIndex((c: any) => c.id === item.id);

  // Helper to determine decimal precision
  const decPrecision = (n?: number) => {
    if (n === undefined || n === null) return 0;
    const s = n.toString();
    if (s.indexOf('.') === -1) return 0;
    return s.length - s.indexOf('.') - 1;
  };

  const renderImageSection = () => {
    if (imageChecklists.length === 0) return null;
    return (
      <div className="card border-0 shadow-sm rounded-3 mb-4">
        <div className="card-header bg-info text-white py-3">
          <h5 className="mb-0 fw-bold"><i className="bi bi-images me-2"></i>Image Evidence</h5>
        </div>
        <div className="card-body">
          {imageChecklists.map((checklist: any) => {
            const globalIndex = getGlobalIndex(checklist);
            const detail = formData.details[globalIndex];

            // Parse Config
            let config = { before: [], after: [] };
            try {
              config = JSON.parse(checklist.options || "{}");
            } catch { }
            const beforePositions = Array.isArray(config.before) && config.before.length > 0 ? config.before : ['Default'];
            const afterPositions = Array.isArray(config.after) && config.after.length > 0 ? config.after : ['Default'];

            // Parse Current Values
            const parseImages = (jsonStr?: string) => {
              try {
                if (!jsonStr) return [];
                if (jsonStr.startsWith('[')) return JSON.parse(jsonStr);
                return [{ label: 'Default', url: jsonStr }];
              } catch { return []; }
            };
            const currentBefore = parseImages(detail?.imageBefore);
            const currentAfter = parseImages(detail?.imageAfter);

            const renderImageInput = (pos: string, type: 'before' | 'after', currentImages: any[]) => {
              const img = currentImages.find((i: any) => i.label === pos);
              return (
                <div key={`${type}-${pos}`} className="d-flex flex-column align-items-center border rounded p-2 bg-white shadow-sm" style={{ minWidth: '120px' }}>
                  <small className="fw-bold mb-1 text-muted">{pos}</small>
                  <div className="mb-2 position-relative" style={{ width: '100px', height: '100px', backgroundColor: '#f8f9fa' }}>
                    {img ? (
                      <img src={img.url} alt={pos} className="w-100 h-100 object-fit-cover rounded" />
                    ) : (
                      <div className="w-100 h-100 d-flex align-items-center justify-content-center text-muted">
                        <i className="bi bi-image fs-1 opacity-25"></i>
                      </div>
                    )}
                  </div>
                  <div className="d-flex gap-1 w-100">
                    {!isViewMode && (
                      <>
                        <label className="btn btn-sm btn-outline-primary flex-grow-1 py-1" title="Upload">
                          <i className="bi bi-upload"></i>
                          <input type="file" style={{ display: 'none' }} accept="image/*" onChange={(e) => e.target.files && handleImageUpload(globalIndex, type === 'before' ? 'imageBefore' : 'imageAfter', pos, e.target.files[0])} disabled={isViewMode} />
                        </label>
                        <button type="button" className="btn btn-sm btn-outline-secondary flex-grow-1 py-1" title="Camera" onClick={() => openCamera(globalIndex, type === 'before' ? 'imageBefore' : 'imageAfter' as any, pos)} disabled={isViewMode}>
                          <i className="bi bi-camera"></i>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            };

            return (
              <div key={checklist.id} className="mb-4 border-bottom pb-4 last-no-border">
                <h6 className="fw-bold mb-3">{checklist.topic}</h6>
                <div className="row g-4">
                  <div className="col-md-6 border-end">
                    <div className="d-flex align-items-center mb-2">
                      <span className="badge bg-secondary me-2">BEFORE</span>
                      <small className="text-muted">Images taken before maintenance</small>
                    </div>
                    <div className="d-flex flex-wrap gap-3">
                      {beforePositions.map((pos: string) => renderImageInput(pos, 'before', currentBefore))}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="d-flex align-items-center mb-2">
                      <span className="badge bg-success me-2">AFTER</span>
                      <small className="text-muted">Images taken after maintenance</small>
                    </div>
                    <div className="d-flex flex-wrap gap-3">
                      {afterPositions.map((pos: string) => renderImageInput(pos, 'after', currentAfter))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };
  // [NEW] Render Sub-Item Section (Horizontal Layout) - Grouped by same subItems
  const renderSubItemSection = () => {
    if (subItemChecklists.length === 0) return null;

    // Group checklists by their subItems (as JSON string for comparison)
    const groups: { [key: string]: { subItems: (string | { name: string; min?: number; max?: number })[]; checklists: any[] } } = {};
    subItemChecklists.forEach((checklist: any) => {
      const opts = safeParseOptions(checklist.options);
      let rawSubItems: (string | { name: string; min?: number; max?: number })[] = opts.subItems || [];

      // [FIX] Deduplicate subItems - if both string "Watt" and {name:"Watt", min, max} exist, keep only the object version
      const seen = new Map<string, number>();
      const deduped: typeof rawSubItems = [];
      rawSubItems.forEach((si) => {
        const name = typeof si === 'string' ? si : si.name;
        const existingIdx = seen.get(name);
        if (existingIdx !== undefined) {
          // Duplicate found - prefer the object version (has min/max)
          if (typeof si !== 'string') {
            deduped[existingIdx] = si; // Replace string with object
          }
          // else: current is string, existing is object — keep object, skip string
        } else {
          seen.set(name, deduped.length);
          deduped.push(si);
        }
      });
      rawSubItems = deduped;

      // Normalize names for grouping key
      const namesKey = JSON.stringify(rawSubItems.map((si: any) => typeof si === 'string' ? si : si.name));
      if (!groups[namesKey]) {
        groups[namesKey] = { subItems: rawSubItems, checklists: [] };
      }
      groups[namesKey].checklists.push(checklist);
    });

    return (
      <div className="card border-0 shadow-sm rounded-3 mb-4">
        <div className="card-header bg-info bg-opacity-75 text-white py-3">
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0 fw-bold"><i className="bi bi-layers me-2"></i>Detailed Inspection (Sub-Items)</h5>
            {/* [NEW] Show last PM date */}
            {!isViewMode && !isEditMode && lastPMDate && (
              <span className="badge bg-warning text-dark" style={{ fontSize: '0.8rem' }}>
                <i className="bi bi-clock-history me-1"></i>
                PM ล่าสุด: {new Date(lastPMDate).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        </div>
        <div className="card-body p-0">
          {Object.entries(groups).map(([key, group]) => {
            const subItemNames = group.subItems;
            return (
              <div key={key} className="p-3 border-bottom">
                <div className="table-responsive">
                  <table className="table table-sm table-bordered table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th style={{ width: '200px' }}>Topic</th>
                        {subItemNames.map((si, idx) => {
                          const name = typeof si === 'string' ? si : si.name;
                          const siMin = typeof si === 'string' ? undefined : si.min;
                          const siMax = typeof si === 'string' ? undefined : si.max;
                          return (
                            <th key={idx} className="text-center" style={{ minWidth: '90px' }}>
                              {name}
                              {(siMin !== undefined || siMax !== undefined) && (
                                <div className="fw-normal text-info" style={{ fontSize: '0.7rem' }}>({siMin ?? '?'} - {siMax ?? '?'})</div>
                              )}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {group.checklists.map((checklist: any) => {
                        return (
                          <tr key={checklist.id}>
                            <td className="fw-bold bg-light align-middle">
                              <i className="bi bi-check2-square me-2 text-primary"></i>
                              {checklist.topic}
                            </td>
                            {subItemNames.map((si, idx) => {
                              const name = typeof si === 'string' ? si : si.name;
                              const siMin = typeof si === 'string' ? undefined : si.min;
                              const siMax = typeof si === 'string' ? undefined : si.max;

                              const { min: resolvedMin, max: resolvedMax } = resolveMinMax(checklist, formData.details);
                              const effMin = siMin ?? resolvedMin;
                              const effMax = siMax ?? resolvedMax;
                              const hasSpec = effMin !== undefined && effMin !== null && effMax !== undefined && effMax !== null;

                              const subDetailKey = `${checklist.id}_${name}`; // [FIX] Name-based key — matches restored state
                              // [NEW] Default isPass to true (OK)
                              const subDetail = (formData as any).subItemDetails?.[subDetailKey] || { isPass: true };
                              return (
                                <td key={idx} className="text-center align-middle">
                                  {checklist.type === 'NUMERIC' ? (
                                    <div>
                                      <input
                                        type="number"
                                        className="form-control form-control-sm text-center"
                                        placeholder="Value"
                                        style={{ minWidth: '60px' }}
                                        value={subDetail.value || ''}
                                        onChange={(e) => {
                                          const existingSubDetails = (formData as any).subItemDetails || {};
                                          const newSubDetails = { ...existingSubDetails };
                                          // [FIX] Use sub-item spec if available, else fallback to parent
                                          const val = parseFloat(e.target.value);
                                          let isPass = true;
                                          if (!isNaN(val) && hasSpec) {
                                            isPass = val >= (effMin as number) && val <= (effMax as number);
                                          }
                                          newSubDetails[subDetailKey] = {
                                            ...subDetail,
                                            value: e.target.value,
                                            isPass,
                                            checklistId: checklist.id,
                                            subItemName: name,
                                            topic: checklist.topic
                                          };
                                          setFormData({ ...formData, subItemDetails: newSubDetails } as any);
                                        }}
                                        disabled={isViewMode}
                                      />
                                      {/* [NEW] Show per-sub-item spec range */}
                                      {hasSpec && (
                                        <small className="text-muted d-block" style={{ fontSize: '0.65rem' }}>({effMin} - {effMax})</small>
                                      )}
                                      {subDetail.value && subDetail.isPass === false && <span className="badge bg-danger mt-1" style={{ fontSize: '0.6rem' }}>NG</span>}
                                      {subDetail.value && subDetail.isPass === true && <span className="badge bg-success mt-1" style={{ fontSize: '0.6rem' }}>OK</span>}
                                    </div>
                                  ) : checklist.type === 'DROPDOWN' ? (
                                    // [NEW] Dropdown select for sub-items
                                    <div>
                                      <select
                                        className="form-select form-select-sm"
                                        style={{ minWidth: '100px' }}
                                        value={subDetail.value || ''}
                                        onChange={(e) => {
                                          const existingSubDetails = (formData as any).subItemDetails || {};
                                          const newSubDetails = { ...existingSubDetails };
                                          newSubDetails[subDetailKey] = {
                                            ...subDetail,
                                            value: e.target.value,
                                            isPass: true, // DROPDOWN ไม่มี pass/fail
                                            checklistId: checklist.id,
                                            subItemName: name,
                                            topic: checklist.topic
                                          };
                                          setFormData({ ...formData, subItemDetails: newSubDetails } as any);
                                        }}
                                        disabled={isViewMode}
                                      >
                                        <option value="">-- เลือก --</option>
                                        {parseDropdownOptions(checklist.options).map((opt: any) => (
                                          <option key={opt.label} value={opt.label}>
                                            {opt.label}{opt.spec && ` (${opt.spec})`}
                                          </option>
                                        ))}
                                      </select>
                                      {/* [NEW] Show last PM value */}
                                      {!isViewMode && !isEditMode && lastPMValues[`${checklist.id}_${name}`] && (
                                        <small className="text-muted d-block" style={{ fontSize: '0.7rem', marginTop: '2px' }}>
                                          ({lastPMValues[`${checklist.id}_${name}`]})
                                        </small>
                                      )}
                                    </div>
                                  ) : checklist.type === 'TEXT' ? (
                                    // [NEW] Text input for sub-items
                                    <div>
                                      <input
                                        type="text"
                                        className="form-control form-control-sm"
                                        style={{ minWidth: '80px' }}
                                        placeholder="..."
                                        value={subDetail.value || ''}
                                        onChange={(e) => {
                                          const existingSubDetails = (formData as any).subItemDetails || {};
                                          const newSubDetails = { ...existingSubDetails };
                                          newSubDetails[subDetailKey] = {
                                            ...subDetail,
                                            value: e.target.value,
                                            isPass: true, // TEXT ไม่มี pass/fail
                                            checklistId: checklist.id,
                                            subItemName: name,
                                            topic: checklist.topic
                                          };
                                          setFormData({ ...formData, subItemDetails: newSubDetails } as any);
                                        }}
                                        disabled={isViewMode}
                                      />
                                      {/* [NEW] Show last PM value */}
                                      {!isViewMode && !isEditMode && lastPMValues[`${checklist.id}_${name}`] && (
                                        <small className="text-muted d-block" style={{ fontSize: '0.7rem', marginTop: '2px' }}>
                                          ({lastPMValues[`${checklist.id}_${name}`]})
                                        </small>
                                      )}
                                    </div>
                                  ) : (
                                    // BOOLEAN: OK/NG buttons
                                    <div className="btn-group btn-group-sm" role="group">
                                      <input
                                        type="radio"
                                        className="btn-check"
                                        name={`subitem_${checklist.id}_${idx}`}
                                        id={`subitem_ok_${checklist.id}_${idx}`}
                                        checked={subDetail.isPass === true}
                                        onChange={() => {
                                          const existingSubDetails = (formData as any).subItemDetails || {};
                                          const newSubDetails = { ...existingSubDetails };
                                          newSubDetails[subDetailKey] = {
                                            ...subDetail,
                                            isPass: true,
                                            checklistId: checklist.id,
                                            subItemName: name,
                                            topic: checklist.topic
                                          };
                                          setFormData({ ...formData, subItemDetails: newSubDetails } as any);
                                        }}
                                        disabled={isViewMode}
                                      />
                                      <label className="btn btn-outline-success" htmlFor={`subitem_ok_${checklist.id}_${idx}`}>OK</label>
                                      <input
                                        type="radio"
                                        className="btn-check"
                                        name={`subitem_${checklist.id}_${idx}`}
                                        id={`subitem_ng_${checklist.id}_${idx}`}
                                        checked={subDetail.isPass === false}
                                        onChange={() => {
                                          const existingSubDetails = (formData as any).subItemDetails || {};
                                          const newSubDetails = { ...existingSubDetails };
                                          newSubDetails[subDetailKey] = {
                                            ...subDetail,
                                            isPass: false,
                                            checklistId: checklist.id,
                                            subItemName: name,
                                            topic: checklist.topic
                                          };
                                          setFormData({ ...formData, subItemDetails: newSubDetails } as any);
                                        }}
                                        disabled={isViewMode}
                                      />
                                      <label className="btn btn-outline-danger" htmlFor={`subitem_ng_${checklist.id}_${idx}`}>NG</label>
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderChecklistTable = (items: Checklist[], title: string) => (
    <div className="card border-0 shadow-sm rounded-3 h-100">
      <div className="card-header bg-primary text-white py-3">
        <h5 className="mb-0 fw-bold"><i className="bi bi-list-check me-2"></i>{title}</h5>
      </div>
      <div className="card-body p-0">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="bg-light text-secondary">
              <tr>
                <th className="ps-3 py-3" style={{ width: '5%' }}>No</th>
                <th className="py-3" style={{ width: '25%' }}>Topic</th>
                <th className="py-3" style={{ width: '15%' }}>Criteria</th>
                <th className="py-3" style={{ width: '25%' }}>Input / Result</th>
                <th className="py-3 text-center" style={{ width: '10%' }}>Status</th>
                <th className="py-3 pe-3" style={{ width: '20%' }}>Remark</th>
              </tr>
            </thead>
            <tbody>
              {items.map((checklist) => {
                const globalIndex = getGlobalIndex(checklist); // Use global index for data binding
                const detail = formData.details[globalIndex];
                if (!detail) return null;

                // Calculate display index specific to Standard Checklists
                const displayIndex = standardChecklists.findIndex((c: any) => c.id === checklist.id);

                // Calculate dynamic step based on precision of minVal/maxVal
                const { min: resolvedMin, max: resolvedMax } = resolveMinMax(checklist, formData.details);

                let step = "1";
                if (checklist.type === 'NUMERIC') {
                  const p1 = decPrecision(resolvedMin);
                  const p2 = decPrecision(resolvedMax);
                  const maxP = Math.max(p1, p2);
                  if (maxP === 0) step = "1";
                  else step = `0.${"0".repeat(maxP - 1)}1`;
                }

                return (
                  <tr key={checklist.id}>
                    <td className="ps-3 fw-bold text-muted">{displayIndex + 1}</td>
                    <td><div className="fw-bold text-dark">{checklist.topic}</div></td>
                    <td>
                      {checklist.type === 'NUMERIC'
                        ? <span className="badge bg-info text-dark rounded-pill fw-normal px-2">Range: {resolvedMin} - {resolvedMax}</span>
                        : checklist.type === 'IMAGE'
                          ? <span className="badge bg-primary text-white rounded-pill fw-normal px-2">Image Evidence</span>
                          : <span className="badge bg-secondary text-white rounded-pill fw-normal px-2">OK / NG</span>}
                    </td>
                    <td>
                      <div className="mb-0">
                        {checklist.type === 'NUMERIC' ? (
                          <input
                            type="number"
                            step={step}
                            className="form-control form-control-sm"
                            placeholder="Value"
                            value={detail?.value || ''}
                            onChange={(e) => handleDetailChange(globalIndex, 'value', e.target.value)}
                            disabled={isViewMode}
                            readOnly={isViewMode}
                          />
                        ) : checklist.type === 'IMAGE' ? (
                          <div className="w-100">
                            {(() => {
                              // Parse Config
                              let config = { before: [], after: [] };
                              try {
                                config = JSON.parse(checklist.options || "{}");
                              } catch { }
                              const beforePositions = Array.isArray(config.before) && config.before.length > 0 ? config.before : ['Default'];
                              const afterPositions = Array.isArray(config.after) && config.after.length > 0 ? config.after : ['Default'];

                              // Parse Current Values
                              const parseImages = (jsonStr?: string) => {
                                try {
                                  if (!jsonStr) return [];
                                  if (jsonStr.startsWith('[')) return JSON.parse(jsonStr);
                                  return [{ label: 'Default', url: jsonStr }];
                                } catch { return []; }
                              };
                              const currentBefore = parseImages(detail?.imageBefore);
                              const currentAfter = parseImages(detail?.imageAfter);

                              const renderImageInput = (pos: string, type: 'before' | 'after', currentImages: any[]) => {
                                const img = currentImages.find((i: any) => i.label === pos);
                                return (
                                  <div key={`${type}-${pos}`} className="d-flex flex-column align-items-center border rounded p-2 bg-white shadow-sm" style={{ minWidth: '120px' }}>
                                    <small className="fw-bold mb-1 text-muted">{pos}</small>
                                    <div className="mb-2 position-relative" style={{ width: '80px', height: '80px', backgroundColor: '#f8f9fa' }}>
                                      {img ? (
                                        <img src={img.url} alt={pos} className="w-100 h-100 object-fit-cover rounded" />
                                      ) : (
                                        <div className="w-100 h-100 d-flex align-items-center justify-content-center text-muted">
                                          <i className="bi bi-image fs-4"></i>
                                        </div>
                                      )}
                                    </div>
                                    <div className="d-flex gap-1 w-100">
                                      <label className="btn btn-xs btn-outline-primary flex-grow-1 py-0" title="Upload">
                                        <i className="bi bi-upload"></i>
                                        <input type="file" hidden accept="image/*" onChange={(e) => e.target.files && handleImageUpload(globalIndex, type === 'before' ? 'imageBefore' : 'imageAfter', pos, e.target.files[0])} disabled={isViewMode} />
                                      </label>
                                      <button type="button" className="btn btn-xs btn-outline-secondary flex-grow-1 py-0" title="Camera" onClick={() => openCamera(globalIndex, type === 'before' ? 'imageBefore' : 'imageAfter' as any, pos)} disabled={isViewMode}>
                                        <i className="bi bi-camera"></i>
                                      </button>
                                    </div>
                                  </div>
                                );
                              };

                              return (
                                <div className="d-flex flex-column gap-2">
                                  {/* Before Section */}
                                  <div className="d-flex align-items-center gap-2 overflow-auto pb-2">
                                    <span className="badge bg-secondary text-white" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', height: '100px' }}>BEFORE</span>
                                    {beforePositions.map((pos: string) => renderImageInput(pos, 'before', currentBefore))}
                                  </div>
                                  {/* After Section */}
                                  <div className="d-flex align-items-center gap-2 overflow-auto pb-2 border-top pt-2">
                                    <span className="badge bg-success text-white" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', height: '100px' }}>AFTER</span>
                                    {afterPositions.map((pos: string) => renderImageInput(pos, 'after', currentAfter))}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        ) : (
                          <div className="btn-group w-100 btn-group-sm" role="group">
                            <input type="radio" className="btn-check" name={`btnradio_${globalIndex}`} id={`btnradio1_${globalIndex}`} autoComplete="off"
                              checked={detail?.isPass === true}
                              onChange={() => handleDetailChange(globalIndex, 'isPass', true)}
                              disabled={isViewMode}
                            />
                            <label className="btn btn-outline-success" htmlFor={`btnradio1_${globalIndex}`}>OK</label>

                            <input type="radio" className="btn-check" name={`btnradio_${globalIndex}`} id={`btnradio2_${globalIndex}`} autoComplete="off"
                              checked={detail?.isPass === false}
                              onChange={() => handleDetailChange(globalIndex, 'isPass', false)}
                              disabled={isViewMode}
                            />
                            <label className="btn btn-outline-danger" htmlFor={`btnradio2_${globalIndex}`}>NG</label>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="text-center">
                      {detail?.isPass === true && (
                        <span className="badge bg-success">PASS</span>
                      )}
                      {detail?.isPass === false && (
                        <span className="badge bg-danger">FAIL</span>
                      )}
                    </td>
                    <td className="pe-3">
                      <textarea
                        className="form-control form-control-sm"
                        rows={1}
                        placeholder="Note..."
                        value={detail?.remark || ''}
                        onChange={(e) => handleDetailChange(globalIndex, 'remark', e.target.value)}
                        disabled={isViewMode}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div className="container-fluid py-4 bg-light min-vh-100">
      <div className="container-fluid px-4">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="fw-bold text-dark mb-1">
              {isViewMode ? 'PM Inspection Record' : isEditMode ? 'Edit PM Inspection' : 'PM Inspection Form'}
            </h2>
            <p className="text-muted mb-0">
              {isViewMode ? 'ดูรายละเอียดการตรวจสอบ PM' : isEditMode ? 'แก้ไขการตรวจสอบ PM' : 'Complete the preventive maintenance checklist'}
            </p>
          </div>
          <Link
            href={searchParams.get('returnTo') || (isViewMode ? "/calendar" : "/")}
            className="btn btn-light shadow-sm border"
          >
            <i className="bi bi-arrow-left me-2"></i>
            {searchParams.get('returnTo')?.includes('history') ? 'Back to History' :
              searchParams.get('returnTo')?.includes('calendar') ? 'Back to Calendar' :
                isViewMode ? 'Back to Calendar' : 'Back to Dashboard'}
          </Link>
        </div>

        {/* Machine Details Card (Merged with Record Info for View Mode) */}
        <div className="card border-0 shadow-sm rounded-3 mb-4">
          <div className="card-body p-4">
            {/* Record Info Section (View/Edit Mode) */}
            {(isViewMode || isEditMode) && pmRecord && (
              <div className="row g-3 mb-4 border-bottom pb-3">
                <div className="col-md-3">
                  <label className="form-label fw-bold text-muted small">Record Date</label>
                  {isEditMode && authUser?.systemRole === 'ADMIN' ? (
                    <input
                      type="datetime-local"
                      className="form-control"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                    />
                  ) : (
                    <p className="mb-0 fw-bold">{new Date(pmRecord.date).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                  )}
                </div>
                <div className="col-md-3">
                  <label className="form-label fw-bold text-muted small">Status</label>
                  <p className="mb-0">
                    <span className={`badge ${pmRecord.status === 'COMPLETED' ? 'bg-success text-white' : 'bg-warning text-dark'}`}>
                      {pmRecord.status}
                    </span>
                  </p>
                </div>
              </div>
            )}

            {/* Machine Info Section */}
            <div className="row align-items-center">
              <div className="col-md-8">
                <h4 className="fw-bold text-primary mb-3">{machine.name}</h4>
                <div className="d-flex gap-4 text-muted">
                  <div><i className="bi bi-upc-scan me-2"></i>{machine.code}</div>
                  <div><i className="bi bi-box-seam me-2"></i>{machine.model || "-"}</div>
                  <div><i className="bi bi-geo-alt me-2"></i>{machine.location}</div>
                </div>
              </div>
              <div className="col-md-4 text-end">
                <span className="badge bg-primary text-white fs-6 px-3 py-2 rounded-pill">
                  PM Inspection{currentPlan?.preventiveType?.name ? ` (${currentPlan.preventiveType.name})` : ''}
                </span>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Reference Diagram */}
          {currentPlan?.preventiveType?.image && (
            <div className="card border-0 shadow-sm rounded-3 mb-4">
              <div className="card-header bg-white border-bottom py-3">
                <h5 className="mb-0 fw-bold text-dark"><i className="bi bi-image me-2 text-primary"></i>Reference Diagram ({currentPlan.preventiveType.name})</h5>
              </div>
              <div className="card-body text-center bg-light">
                <img
                  src={`${config.apiServer}${currentPlan.preventiveType.image}`}
                  alt="Reference Diagram"
                  className="img-fluid rounded shadow-sm"
                  style={{ maxHeight: '400px', objectFit: 'contain' }}
                />
              </div>
            </div>
          )}

          {/* Personnel Selection */}
          {!isViewMode && !isEditMode && (
            <div className="card border-0 shadow-sm rounded-3 mb-4">
              <div className="card-body p-4">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label fw-bold text-muted small">Inspector (ผู้ตรวจ)</label>
                    <select className="form-select form-select-lg bg-light border-0" value={formData.inspector} onChange={(e) => {
                      const val = e.target.value;
                      setFormData({ ...formData, inspector: val });
                      localStorage.setItem('lastInspector', val);
                    }} required>
                      <option value="">-- Select Inspector --</option>
                      {inspectors.map(u => (
                        <option key={u.id} value={`${u.name}${u.employeeId ? ` (${u.employeeId})` : ''}`}>
                          {u.name}{u.employeeId ? ` (${u.employeeId})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-bold text-muted small">Checker (ผู้ตรวจสอบ)</label>
                    <select className="form-select form-select-lg bg-light border-0" value={formData.checker} onChange={(e) => {
                      const val = e.target.value;
                      setFormData({ ...formData, checker: val });
                      localStorage.setItem('lastChecker', val);
                    }} required>
                      <option value="">-- Select Checker --</option>
                      {checkers.map(u => (
                        <option key={u.id} value={`${u.name}${u.employeeId ? ` (${u.employeeId})` : ''}`}>
                          {u.name}{u.employeeId ? ` (${u.employeeId})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* View/Edit Mode: Personnel Display/Selection */}
          {(isViewMode || isEditMode) && (
            <div className="card border-0 shadow-sm rounded-3 mb-4">
              <div className="card-body p-4">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label fw-bold text-muted small">Inspector (ผู้ตรวจ)</label>
                    {isViewMode ? (
                      <p className="mb-0 fw-bold text-dark">{formData.inspector}</p>
                    ) : (
                      <select className="form-select form-select-lg bg-light border-0" value={formData.inspector} onChange={(e) => {
                        const val = e.target.value;
                        setFormData({ ...formData, inspector: val });
                        localStorage.setItem('lastInspector', val);
                      }} required>
                        <option value="">-- Select Inspector --</option>
                        {inspectors.map(u => (
                          <option key={u.id} value={`${u.name}${u.employeeId ? ` (${u.employeeId})` : ''}`}>
                            {u.name}{u.employeeId ? ` (${u.employeeId})` : ''}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-bold text-muted small">Checker (ผู้ตรวจสอบ)</label>
                    {isViewMode ? (
                      <p className="mb-0 fw-bold text-dark">{formData.checker}</p>
                    ) : (
                      <select className="form-select form-select-lg bg-light border-0" value={formData.checker} onChange={(e) => {
                        const val = e.target.value;
                        setFormData({ ...formData, checker: val });
                        localStorage.setItem('lastChecker', val);
                      }} required>
                        <option value="">-- Select Checker --</option>
                        {checkers.map(u => (
                          <option key={u.id} value={`${u.name}${u.employeeId ? ` (${u.employeeId})` : ''}`}>
                            {u.name}{u.employeeId ? ` (${u.employeeId})` : ''}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Standard Checklists - 2 Column Layout */}
          {/* Additional Details Section (Moved Up) */}
          {detailChecklists.length > 0 && (
            <div className="card border-0 shadow-sm rounded-3 mb-4">
              <div className="card-header bg-info text-dark py-3">
                <h5 className="mb-0 fw-bold"><i className="bi bi-info-circle me-2"></i>Additional Details</h5>
              </div>
              <div className="card-body p-4">
                <div className="row g-3">
                  {detailChecklists.map((item: any) => {
                    const globalIndex = getGlobalIndex(item);
                    const detail = formData.details[globalIndex];
                    if (!detail) return null;
                    const options = item.options ? (() => {
                      try {
                        const parsed = JSON.parse(item.options);
                        // New format: { options: [{label, spec}], ... }
                        if (parsed.options && Array.isArray(parsed.options)) {
                          return parsed.options;
                        }
                        // Legacy Array format
                        if (Array.isArray(parsed)) {
                          return parsed;
                        }
                        return [];
                      } catch {
                        return item.options.split(',').map((o: string) => o.trim());
                      }
                    })() : [];

                    return (
                      <div className="col-md-6" key={item.id}>
                        <label className="form-label fw-bold text-muted small">
                          {item.topic} {item.isRequired && <span className="text-danger">*</span>}
                        </label>
                        {item.type === 'DROPDOWN' ? (
                          <>
                            <select
                              className="form-select"
                              value={detail?.value || ''}
                              onChange={(e) => handleDetailChange(globalIndex, 'value', e.target.value)}
                              disabled={isViewMode}
                            >
                              <option value="">-- Select --</option>
                              {options.map((opt: any, idx: number) => {
                                const label = typeof opt === 'string' ? opt : opt.label;
                                return <option key={idx} value={label}>{label}</option>;
                              })}
                            </select>
                            {/* Display Spec + PASS/FAIL if available */}
                            {(() => {
                              if (!detail?.value) return null;
                              const selectedOpt = options.find((o: any) => (typeof o === 'string' ? o : o.label) === detail.value);
                              if (selectedOpt && typeof selectedOpt !== 'string' && selectedOpt.spec) {
                                const hasMinMax = item.minVal !== null && item.minVal !== undefined && item.maxVal !== null && item.maxVal !== undefined;
                                return (
                                  <div className="d-flex align-items-center gap-2 mt-1">
                                    <span className="form-text text-info mb-0"><i className="bi bi-info-circle me-1"></i>Spec: {selectedOpt.spec}</span>
                                    {hasMinMax && (
                                      detail?.isPass === false
                                        ? <span className="badge bg-danger">NG</span>
                                        : <span className="badge bg-success">OK</span>
                                    )}
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </>
                        ) : (
                          <input
                            type="text"
                            className="form-control"
                            value={detail?.value || ''}
                            onChange={(e) => handleDetailChange(globalIndex, 'value', e.target.value)}
                            disabled={isViewMode}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Image Evidence Section */}
          {renderImageSection()}

          {/* [NEW] Sub-Item Section (Horizontal Layout) */}
          {renderSubItemSection()}

          {/* Standard Checklists - 2 Column Layout */}
          <div className="row g-4 mb-4">
            <div className="col-lg-6">
              {renderChecklistTable(leftChecklists, "Checklist Part 1")}
            </div>
            <div className="col-lg-6">
              {renderChecklistTable(rightChecklists, "Checklist Part 2")}
            </div>
          </div>

          {!isViewMode && (
            <div className="card border-0 shadow-sm rounded-3 mb-4">
              <div className="card-body p-4">
                <label className="form-label fw-bold text-muted small">Remark (Note)</label>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="Additional remarks..."
                  value={formData.remark}
                  onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                />
              </div>
            </div>
          )}

          {!isViewMode && (
            <div className="d-grid gap-2 d-md-flex justify-content-md-end mb-5">
              <Link href={searchParams.get('returnTo') || "/"} className="btn btn-light border px-4 py-2">
                Cancel
              </Link>
              <button type="submit" className="btn btn-primary px-5 py-2 shadow-sm fw-bold">
                <i className="bi bi-check-circle me-2"></i>
                {isEditMode ? 'Update Record' : 'Submit Record'}
              </button>
            </div>
          )}
        </form>
      </div>
      <CameraModal isOpen={isCameraOpen} onClose={() => setIsCameraOpen(false)} onCapture={handleCameraCapture} />
    </div>
  );
}


