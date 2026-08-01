import { useRef, useState, type ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Camera } from 'lucide-react';
import { NewMemberSchema, type NewMember } from '@gymbar/shared';
import type { Member } from '@/domain/member/member.entity';
import { memberInitials } from '@/domain/member/member.entity';
import { Sheet } from '@/shared/ui/Sheet';
import { Button } from '@/shared/ui/Button';
import { Field, Input, Textarea } from '@/shared/ui/Field';
import { Avatar } from '@/shared/ui/Avatar';
import { useCreateMember, useUpdateMember } from '../api/useMemberMutations';

interface MemberSheetProps {
  open: boolean;
  onClose: () => void;
  /** Si se pasa, el sheet edita; si no, crea. */
  member?: Member | null;
  onCreated?: (member: Member) => void;
}

export function MemberSheet({ open, onClose, member, onCreated }: MemberSheetProps) {
  const isEdit = !!member;
  const create = useCreateMember();
  const update = useUpdateMember();
  const fileRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(member?.photoUrl ?? null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NewMember>({
    resolver: zodResolver(NewMemberSchema),
    defaultValues: {
      firstName: member?.firstName ?? '',
      lastName: member?.lastName ?? '',
      phone: member?.phone ?? '',
      email: member?.email ?? '',
      notes: member?.notes ?? '',
    },
  });

  function pickPhoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function onSubmit(data: NewMember) {
    if (isEdit && member) {
      await update.mutateAsync({ id: member.id, patch: data });
    } else {
      const created = await create.mutateAsync({ input: data, photo });
      onCreated?.(created);
    }
    reset();
    setPhoto(null);
    setPhotoPreview(null);
    onClose();
  }

  const initials = memberInitials({
    firstName: member?.firstName || 'N',
    lastName: member?.lastName || 'N',
  });

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar cliente' : 'Nuevo cliente'}
      description={isEdit ? undefined : 'Solo nombre y apellido son obligatorios.'}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} type="button">
            Cancelar
          </Button>
          <Button type="submit" form="member-form" loading={isSubmitting}>
            {isEdit ? 'Guardar cambios' : 'Crear cliente'}
          </Button>
        </div>
      }
    >
      <form id="member-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="flex items-center gap-4">
          <Avatar photoUrl={photoPreview} initials={initials} size="lg" />
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={pickPhoto}
            />
            <Button
              variant="secondary"
              size="sm"
              type="button"
              onClick={() => fileRef.current?.click()}
            >
              <Camera className="h-4 w-4" />
              {photoPreview ? 'Cambiar foto' : 'Agregar foto'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Nombre" htmlFor="firstName" error={errors.firstName?.message} required>
            <Input
              id="firstName"
              autoFocus
              invalid={!!errors.firstName}
              {...register('firstName')}
            />
          </Field>
          <Field label="Apellido" htmlFor="lastName" error={errors.lastName?.message} required>
            <Input id="lastName" invalid={!!errors.lastName} {...register('lastName')} />
          </Field>
        </div>

        <Field label="Teléfono" htmlFor="phone" error={errors.phone?.message}>
          <Input id="phone" type="tel" placeholder="+52 55 0000 0000" {...register('phone')} />
        </Field>

        <Field label="Correo" htmlFor="email" error={errors.email?.message}>
          <Input id="email" type="email" {...register('email')} />
        </Field>

        <Field label="Notas" htmlFor="notes" error={errors.notes?.message}>
          <Textarea
            id="notes"
            placeholder="Observaciones, lesiones, preferencias…"
            {...register('notes')}
          />
        </Field>
      </form>
    </Sheet>
  );
}
