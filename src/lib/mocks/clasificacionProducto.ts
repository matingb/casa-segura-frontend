import { subtiposMock } from './subtipos';
import { tiposMock } from './tipos';

export function getSubtipoNombre(subtipoId: string): string {
  return subtiposMock.find((subtipo) => subtipo.id === subtipoId)?.nombre ?? 'Sin subtipo';
}

export function getTipoIdDeSubtipo(subtipoId: string): string | undefined {
  return subtiposMock.find((subtipo) => subtipo.id === subtipoId)?.tipoId;
}

export function getTipoNombre(tipoId: string): string {
  return tiposMock.find((tipo) => tipo.id === tipoId)?.nombre ?? 'Sin tipo';
}

export function getSubtiposPorTipo(tipoId: string) {
  return subtiposMock.filter((subtipo) => subtipo.tipoId === tipoId);
}
