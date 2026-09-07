import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { apiPost, apiGet, ApiError } from '@/lib/api';
import type { CreateBenchMoveDTO, BenchMoveResultDTO, SupervisorChainDTO } from '@shared/dto';
import type { ProjectAssignmentWithDetailsDTO } from '@shared/dto';

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface UseBenchMoveOptions {
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

export function useBenchMove(
  projects: ProjectAssignmentWithDetailsDTO[],
  options?: UseBenchMoveOptions,
) {
  const navigate = useNavigate();

  const [selectedTeamMemberId, setSelectedTeamMemberId] = useState<number | null>(null);
  const [projectEndDates, setProjectEndDates] = useState<Record<number, string>>({});
  const [newSupervisorId, setNewSupervisorId] = useState<number | null>(null);
  const [functionalAreaId, setFunctionalAreaId] = useState<number | null>(null);
  const [allocation, setAllocationValue] = useState<string>('');
  const [startDate, setStartDateValue] = useState<string>(todayISO());
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [displayChain, setDisplayChain] = useState<SupervisorChainDTO[]>([]);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pre-fill end dates with today whenever projects change
  useEffect(() => {
    const today = todayISO();
    const dates: Record<number, string> = {};
    for (const p of projects) {
      dates[p.projectAssignmentId] = today;
    }
    setProjectEndDates(dates);
  }, [projects]);

  /** Called by the page after the initial data load to pre-fill L1 and L2/L3 display. */
  const initSupervisorChain = useCallback((chain: SupervisorChainDTO[]) => {
    const l1 = chain.find((c) => c.level === 1);
    if (l1) setNewSupervisorId(l1.teamMemberId);
    // Keep levels 2 and 3 for read-only display
    setDisplayChain(chain.filter((c) => c.level !== 1));
  }, []);

  const setTeamMember = useCallback((id: number | null) => {
    setSelectedTeamMemberId(id);
    setNewSupervisorId(null);
    setDisplayChain([]);
    setProjectEndDates({});
    setValidationError(null);
  }, []);

  const setEndDate = useCallback((projectAssignmentId: number, date: string) => {
    setProjectEndDates((prev) => ({ ...prev, [projectAssignmentId]: date }));
  }, []);

  /** Update L1 selection and debounce a re-fetch of L2/L3. */
  const setSupervisor = useCallback((id: number) => {
    setNewSupervisorId(id);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      try {
        const chain = await apiGet<SupervisorChainDTO[]>(
          `/api/team-members/${id}/supervisor-chain`,
        );
        // Remap: chain[level=1] is the new L2, chain[level=2] is the new L3
        const remapped: SupervisorChainDTO[] = chain
          .filter((c) => c.level === 1 || c.level === 2)
          .map((c) => ({ ...c, level: (c.level + 1) as 2 | 3 }));
        setDisplayChain(remapped);
      } catch {
        setDisplayChain([]);
      }
    }, 300);
  }, []);

  const setFunctionalArea = useCallback((id: number) => {
    setFunctionalAreaId(id);
  }, []);

  const setAllocation = useCallback((value: string) => {
    setAllocationValue(value);
  }, []);

  const setStartDate = useCallback((date: string) => {
    setStartDateValue(date);
  }, []);

  const openConfirm = useCallback(() => {
    setValidationError(null);

    if (!selectedTeamMemberId) {
      setValidationError('Please select a team member.');
      return;
    }
    if (!newSupervisorId) {
      setValidationError('Please select a supervisor (L1).');
      return;
    }
    if (!functionalAreaId) {
      setValidationError('Please select a functional area.');
      return;
    }
    const alloc = parseFloat(allocation);
    if (!allocation || isNaN(alloc) || alloc < 0.01 || alloc > 1.0) {
      setValidationError('Allocation must be between 0.01 and 1.00.');
      return;
    }
    if (!startDate) {
      setValidationError('Please set a start date.');
      return;
    }
    for (const p of projects) {
      if (!projectEndDates[p.projectAssignmentId]) {
        setValidationError('All project assignments must have an end date.');
        return;
      }
    }

    if (projects.length > 0) {
      const today = todayISO();
      const hasEndedProject = projects.some(
        (p) => projectEndDates[p.projectAssignmentId] <= today,
      );
      if (!hasEndedProject) {
        setValidationError(
          'At least one project must end today or earlier. The team member must be freed from at least one active project before moving to bench.',
        );
        return;
      }
    }

    setIsConfirmOpen(true);
  }, [
    selectedTeamMemberId,
    newSupervisorId,
    functionalAreaId,
    allocation,
    startDate,
    projects,
    projectEndDates,
  ]);

  const closeConfirm = useCallback(() => {
    setIsConfirmOpen(false);
  }, []);

  const submitBenchMove = useCallback(async () => {
    if (!selectedTeamMemberId || !newSupervisorId || !functionalAreaId) return;

    setIsSubmitting(true);
    try {
      const dto: CreateBenchMoveDTO = {
        teamMemberId: selectedTeamMemberId,
        projectAssignmentUpdates: projects.map((p) => ({
          projectAssignmentId: p.projectAssignmentId,
          endDate: projectEndDates[p.projectAssignmentId],
        })),
        newSupervisorId,
        startDate,
        functionalAreaId,
        allocation: parseFloat(allocation),
      };
      const result = await apiPost<BenchMoveResultDTO, CreateBenchMoveDTO>(
        '/api/bench-move',
        dto,
      );
      setIsConfirmOpen(false);
      options?.onSuccess?.('Bench move created successfully.');
      navigate(`/bench-move/${result.benchId}`);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to submit bench move';
      options?.onError?.(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    selectedTeamMemberId,
    newSupervisorId,
    functionalAreaId,
    allocation,
    startDate,
    projects,
    projectEndDates,
    navigate,
    options,
  ]);

  const resetForm = useCallback(() => {
    setSelectedTeamMemberId(null);
    setProjectEndDates({});
    setNewSupervisorId(null);
    setFunctionalAreaId(null);
    setAllocationValue('');
    setStartDateValue(todayISO());
    setIsConfirmOpen(false);
    setDisplayChain([]);
    setValidationError(null);
  }, []);

  return {
    selectedTeamMemberId,
    projectEndDates,
    newSupervisorId,
    functionalAreaId,
    allocation,
    startDate,
    isConfirmOpen,
    isSubmitting,
    validationError,
    displayChain,
    initSupervisorChain,
    setTeamMember,
    setEndDate,
    setSupervisor,
    setFunctionalArea,
    setAllocation,
    setStartDate,
    openConfirm,
    closeConfirm,
    submitBenchMove,
    resetForm,
  };
}
