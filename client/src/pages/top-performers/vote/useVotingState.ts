import { useState } from 'react';

export interface TopFiveSlot {
  rank: number;
  points: number;
  nomId: number | null;
}

const INITIAL_SLOTS: TopFiveSlot[] = [
  { rank: 1, points: 10, nomId: null },
  { rank: 2, points: 8, nomId: null },
  { rank: 3, points: 6, nomId: null },
  { rank: 4, points: 4, nomId: null },
  { rank: 5, points: 2, nomId: null },
];

export function useVotingState() {
  const [slots, setSlots] = useState<TopFiveSlot[]>(INITIAL_SLOTS);

  const selectedIds = slots.map((s) => s.nomId).filter((id): id is number => id !== null);
  const isComplete = selectedIds.length === 5;

  function addToSlot(nomId: number, rank: number) {
    setSlots((prev) =>
      prev.map((s) => {
        if (s.nomId === nomId) return { ...s, nomId: null };
        if (s.rank === rank) return { ...s, nomId };
        return s;
      })
    );
  }

  function removeFromSlot(rank: number) {
    setSlots((prev) => prev.map((s) => (s.rank === rank ? { ...s, nomId: null } : s)));
  }

  function addToNextEmpty(nomId: number) {
    const emptySlot = slots.find((s) => s.nomId === null);
    if (emptySlot) addToSlot(nomId, emptySlot.rank);
  }

  function swapIntoSlot(nomId: number, targetRank: number) {
    setSlots((prev) => {
      const sourceSlot = prev.find((s) => s.nomId === nomId);
      const targetSlot = prev.find((s) => s.rank === targetRank);
      if (!targetSlot) return prev;

      const displacedNomId = targetSlot.nomId;
      const sourceRank = sourceSlot?.rank ?? null;

      return prev.map((s) => {
        if (s.rank === targetRank) return { ...s, nomId };
        if (sourceRank !== null && s.rank === sourceRank) return { ...s, nomId: displacedNomId };
        return s;
      });
    });
  }

  function reorder(fromRank: number, toRank: number) {
    setSlots((prev) => {
      const result = [...prev];
      const fromIdx = result.findIndex((s) => s.rank === fromRank);
      const toIdx = result.findIndex((s) => s.rank === toRank);
      if (fromIdx === -1 || toIdx === -1) return result;
      const fromNomId = result[fromIdx].nomId;
      result[fromIdx] = { ...result[fromIdx], nomId: result[toIdx].nomId };
      result[toIdx] = { ...result[toIdx], nomId: fromNomId };
      return result;
    });
  }

  function isSelected(nomId: number) {
    return selectedIds.includes(nomId);
  }

  return { slots, selectedIds, isComplete, addToSlot, removeFromSlot, addToNextEmpty, reorder, isSelected, swapIntoSlot };
}
