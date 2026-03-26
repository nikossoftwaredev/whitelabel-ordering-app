"use client";

import { Trash2 } from "lucide-react";
import { useEffect,useState } from "react";

import { AddButton } from "@/components/add-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

interface ModifierOptionForm {
  id?: string;
  name: string;
  nameEl: string;
  priceAdjustmentCents: number; // stored in cents
  isDefault: boolean;
  isActive: boolean;
}

interface ModifierGroup {
  id: string;
  name: string;
  nameEl: string | null;
  required: boolean;
  minSelect: number;
  maxSelect: number;
  options: {
    id: string;
    name: string;
    nameEl: string | null;
    priceAdjustment: number;
    isDefault: boolean;
    isActive: boolean;
  }[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  group?: ModifierGroup | null;
  onSuccess: () => void;
}

export function ModifierGroupFormDialog({
  open,
  onOpenChange,
  tenantId,
  group,
  onSuccess,
}: Props) {
  const [name, setName] = useState("");
  const [nameEl, setNameEl] = useState("");
  const [required, setRequired] = useState(false);
  const [minSelect, setMinSelect] = useState(0);
  const [maxSelect, setMaxSelect] = useState(1);
  const [options, setOptions] = useState<ModifierOptionForm[]>([
    { name: "", nameEl: "", priceAdjustmentCents: 0, isDefault: false, isActive: true },
  ]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (group) {
      setName(group.name);
      setNameEl(group.nameEl || "");
      setRequired(group.required);
      setMinSelect(group.minSelect);
      setMaxSelect(group.maxSelect);
      setOptions(
        group.options.map((o) => ({
          id: o.id,
          name: o.name,
          nameEl: o.nameEl || "",
          priceAdjustmentCents: o.priceAdjustment,
          isDefault: o.isDefault,
          isActive: o.isActive,
        }))
      );
    } else {
      setName("");
      setNameEl("");
      setRequired(false);
      setMinSelect(0);
      setMaxSelect(1);
      setOptions([{ name: "", nameEl: "", priceAdjustmentCents: 0, isDefault: false, isActive: true }]);
    }
  }, [group, open]);

  const addOption = () => {
    setOptions([...options, { name: "", nameEl: "", priceAdjustmentCents: 0, isDefault: false, isActive: true }]);
  };

  const removeOption = (idx: number) => {
    setOptions(options.filter((_, i) => i !== idx));
  };

  const updateOption = (idx: number, field: keyof ModifierOptionForm, value: string | number | boolean) => {
    setOptions(options.map((o, i) => (i === idx ? { ...o, [field]: value } : o)));
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        nameEl: nameEl.trim() || null,
        required,
        minSelect,
        maxSelect,
        options: options
          .filter((o) => o.name.trim())
          .map((o, idx) => ({
            ...(o.id ? { id: o.id } : {}),
            name: o.name.trim(),
            nameEl: o.nameEl.trim() || null,
            priceAdjustment: o.priceAdjustmentCents, // already in cents
            isDefault: o.isDefault,
            isActive: o.isActive,
            sortOrder: idx,
          })),
      };

      const url = group
        ? `/api/admin/${tenantId}/modifier-groups/${group.id}`
        : `/api/admin/${tenantId}/modifier-groups`;

      await fetch(url, {
        method: group ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      onSuccess();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const saveLabel = group ? "Save changes" : "Create group";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl min-h-0">
        <DialogHeader>
          <DialogTitle>{group ? "Edit modifier group" : "New modifier group"}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 space-y-4">
          {/* Group fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Name (EN) *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Milk Type" />
            </div>
            <div className="space-y-1.5">
              <Label>Name (EL)</Label>
              <Input value={nameEl} onChange={(e) => setNameEl(e.target.value)} placeholder="e.g. Τύπος Γάλακτος" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 items-center">
            <div className="flex items-center gap-2">
              <Switch checked={required} onCheckedChange={setRequired} id="required-switch" />
              <Label htmlFor="required-switch">Required</Label>
            </div>
            <div className="space-y-1.5">
              <Label>Min selections</Label>
              <Input
                type="number"
                min={0}
                max={maxSelect}
                value={minSelect}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setMinSelect(v);
                  if (v > maxSelect) setMaxSelect(v);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Max selections</Label>
              <Input
                type="number"
                min={minSelect || 1}
                value={maxSelect}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setMaxSelect(v);
                  if (v < minSelect) setMinSelect(v);
                }}
              />
            </div>
          </div>

          <Separator />

          {/* Options */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Options</Label>
            {options.map((opt, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_1fr_80px_auto_auto_auto] gap-2 items-center">
                <Input
                  placeholder="Name (EN)"
                  value={opt.name}
                  onChange={(e) => updateOption(idx, "name", e.target.value)}
                />
                <Input
                  placeholder="Name (EL)"
                  value={opt.nameEl}
                  onChange={(e) => updateOption(idx, "nameEl", e.target.value)}
                />
                <Input
                  type="number"
                  step="0.05"
                  placeholder="Price +€"
                  value={opt.priceAdjustmentCents === 0 ? "" : (opt.priceAdjustmentCents / 100).toFixed(2)}
                  onChange={(e) =>
                    updateOption(
                      idx,
                      "priceAdjustmentCents",
                      Math.round(parseFloat(e.target.value || "0") * 100)
                    )
                  }
                />
                <div className="flex items-center gap-1">
                  <Switch
                    checked={opt.isDefault}
                    onCheckedChange={(v) => updateOption(idx, "isDefault", v)}
                    className="scale-75"
                  />
                  <span className="text-xs text-muted-foreground">Def</span>
                </div>
                <div className="flex items-center gap-1">
                  <Switch
                    checked={opt.isActive}
                    onCheckedChange={(v) => updateOption(idx, "isActive", v)}
                    className="scale-75"
                  />
                  <span className="text-xs text-muted-foreground">On</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-destructive"
                  onClick={() => removeOption(idx)}
                  disabled={options.length <= 1}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
            <AddButton variant="outline" size="sm" onClick={addOption}>
              Add option
            </AddButton>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? "Saving..." : saveLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
