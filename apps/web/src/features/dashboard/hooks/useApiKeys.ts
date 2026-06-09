import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listApiKeys, createApiKey, revokeApiKey, regenerateApiKey } from "@/shared/api/api-keys.api";
import type { ApiKeyCreated } from "@/shared/api/api-keys.api";
import { copyToClipboard } from "@/shared/utils/clipboard";
import { queryKeys } from "@/shared/lib/queryKeys";

export type ExpiryPreset = "30d" | "90d" | "1y" | "none" | "custom";

const expiresAtFromPreset = (preset: ExpiryPreset, customDate: string): string | undefined => {
  if (preset === "30d") return new Date(Date.now() + 30 * 86400000).toISOString();
  if (preset === "90d") return new Date(Date.now() + 90 * 86400000).toISOString();
  if (preset === "1y") return new Date(Date.now() + 365 * 86400000).toISOString();
  if (preset === "custom" && customDate) return new Date(customDate).toISOString();
  return undefined;
};

export const useApiKeys = () => {
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formExpiry, setFormExpiry] = useState<ExpiryPreset>("1y");
  const [formCustomDate, setFormCustomDate] = useState("");
  const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null);
  const [confirmRegenerateId, setConfirmRegenerateId] = useState<string | null>(null);
  const [revealedKey, setRevealedKey] = useState<ApiKeyCreated | null>(null);
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: keys = [], isLoading } = useQuery({
    queryKey: queryKeys.apiKeys(),
    queryFn: listApiKeys,
  });

  const createMutation = useMutation({
    mutationFn: createApiKey,
    onSuccess: (data) => {
      setRevealedKey(data);
      setShowForm(false);
      setFormName("");
      setFormExpiry("1y");
      setFormCustomDate("");
      void queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys() });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: revokeApiKey,
    onSuccess: () => {
      setConfirmRevokeId(null);
      void queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys() });
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: regenerateApiKey,
    onSuccess: (data) => {
      setRevealedKey(data);
      setConfirmRegenerateId(null);
      void queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys() });
    },
  });

  const handleCreate = () => {
    if (formExpiry === "custom" && formCustomDate) {
      if (new Date(formCustomDate).getTime() <= Date.now()) return;
    }
    const expiresAt = expiresAtFromPreset(formExpiry, formCustomDate);
    const trimmedName = formName.trim();
    const body: { name?: string; expiresAt?: string } = {};
    if (trimmedName) body.name = trimmedName;
    if (expiresAt) body.expiresAt = expiresAt;
    createMutation.mutate(body);
  };

  const handleCopyKey = async () => {
    if (!revealedKey) return;
    await copyToClipboard(revealedKey.apiKey);
    setCopied(true);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
  };

  const handleDismissReveal = () => {
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    setRevealedKey(null);
    setCopied(false);
  };

  return {
    keys,
    isLoading,
    showForm,
    setShowForm,
    formName,
    setFormName,
    formExpiry,
    setFormExpiry,
    formCustomDate,
    setFormCustomDate,
    confirmRevokeId,
    setConfirmRevokeId,
    confirmRegenerateId,
    setConfirmRegenerateId,
    revealedKey,
    copied,
    createMutation,
    revokeMutation,
    regenerateMutation,
    handleCreate,
    handleCopyKey,
    handleDismissReveal,
  };
};
