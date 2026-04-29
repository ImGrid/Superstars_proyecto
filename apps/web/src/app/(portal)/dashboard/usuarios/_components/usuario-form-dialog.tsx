"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  createUsuarioSchema,
  RolUsuario,
  type UpdateUsuarioDto,
  type UsuarioResponse,
} from "@superstars/shared";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { createUsuario, updateUsuario } from "@/lib/api/usuario.api";
import { usuarioQueries } from "@/lib/api/query-keys";

// labels legibles para cada rol
const rolLabels: Record<RolUsuario, string> = {
  [RolUsuario.ADMINISTRADOR]: "Administrador",
  [RolUsuario.RESPONSABLE_CONVOCATORIA]: "Responsable de convocatoria",
  [RolUsuario.PROPONENTE]: "Proponente",
  [RolUsuario.EVALUADOR]: "Evaluador",
};

// schema para el formulario de crear (igual al del backend)
const createFormSchema = createUsuarioSchema;
type CreateFormValues = z.infer<typeof createFormSchema>;

// schema para el formulario de editar (activo como string para el Select, sin transform)
const editFormSchema = z.object({
  nombre: z.string().min(1).optional(),
  rol: z.nativeEnum(RolUsuario).optional(),
  activo: z.enum(["true", "false"]),
});
type EditFormValues = z.infer<typeof editFormSchema>;

interface UsuarioFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  usuario?: UsuarioResponse;
}

export function UsuarioFormDialog({
  open,
  onOpenChange,
  usuario,
}: UsuarioFormDialogProps) {
  const isEditing = !!usuario;
  const queryClient = useQueryClient();

  // formulario de crear
  const createForm = useForm<CreateFormValues>({
    resolver: zodResolver(createFormSchema),
    defaultValues: { nombre: "", email: "", password: "", rol: RolUsuario.PROPONENTE },
  });

  // formulario de editar
  const editForm = useForm<EditFormValues>({
    resolver: zodResolver(editFormSchema),
    defaultValues: { nombre: "", rol: RolUsuario.PROPONENTE, activo: "true" },
  });

  // resetear formularios cuando cambia el usuario o se abre/cierra
  useEffect(() => {
    if (!open) return;
    if (usuario) {
      editForm.reset({
        nombre: usuario.nombre,
        rol: usuario.rol,
        activo: usuario.activo ? "true" : "false",
      });
    } else {
      createForm.reset({
        nombre: "",
        email: "",
        password: "",
        rol: RolUsuario.PROPONENTE,
      });
    }
  }, [open, usuario, createForm, editForm]);

  // mutacion crear
  const createMutation = useMutation({
    mutationFn: createUsuario,
    onSuccess: () => {
      toast.success("Usuario creado correctamente");
      queryClient.invalidateQueries({ queryKey: usuarioQueries.all() });
      onOpenChange(false);
    },
    onError: (error: any) => {
      const msg =
        error.response?.data?.message ?? "Error al crear el usuario";
      toast.error(msg);
    },
  });

  // mutacion editar
  const updateMutation = useMutation({
    mutationFn: (data: UpdateUsuarioDto) =>
      updateUsuario(usuario!.id, data),
    onSuccess: () => {
      toast.success("Usuario actualizado correctamente");
      queryClient.invalidateQueries({ queryKey: usuarioQueries.all() });
      onOpenChange(false);
    },
    onError: (error: any) => {
      const msg =
        error.response?.data?.message ?? "Error al actualizar el usuario";
      toast.error(msg);
    },
  });

  const isLoading = createMutation.isPending || updateMutation.isPending;

  function onSubmitCreate(values: CreateFormValues) {
    createMutation.mutate(values);
  }

  function onSubmitEdit(values: EditFormValues) {
    // transformar activo de string a boolean antes de enviar
    const dto = {
      nombre: values.nombre,
      rol: values.rol,
      activo: values.activo === "true",
    };
    updateMutation.mutate(dto);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar usuario" : "Nuevo usuario"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifica los datos del usuario."
              : "Completa los datos para crear un nuevo usuario."}
          </DialogDescription>
        </DialogHeader>

        {isEditing ? (
          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit(onSubmitEdit)}
              className="space-y-4"
            >
              <FormField
                control={editForm.control}
                name="nombre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input placeholder="Nombre completo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="rol"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rol</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(rolLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="activo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="true">Activo</SelectItem>
                        <SelectItem value="false">Inactivo</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="animate-spin" />}
                  Guardar cambios
                </Button>
              </DialogFooter>
            </form>
          </Form>
        ) : (
          <Form {...createForm}>
            <form
              onSubmit={createForm.handleSubmit(onSubmitCreate)}
              className="space-y-4"
            >
              <FormField
                control={createForm.control}
                name="nombre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input placeholder="Nombre completo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="usuario@ejemplo.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contrasena</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Minimo 8 caracteres"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="rol"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rol</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(rolLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="animate-spin" />}
                  Crear usuario
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
