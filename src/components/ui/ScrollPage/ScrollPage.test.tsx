import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import ScrollPage from './ScrollPage';

// Mock de IntersectionObserver — debe ser una función constructora (no arrow)
const mockObserve = vi.fn();
const mockDisconnect = vi.fn();

vi.stubGlobal('IntersectionObserver', function MockIntersectionObserver() {
  return { observe: mockObserve, disconnect: mockDisconnect, unobserve: vi.fn() };
});

describe('ScrollPage', () => {
  it('renderiza los children', () => {
    render(
      <ScrollPage>
        <p>Contenido de prueba</p>
      </ScrollPage>
    );
    expect(screen.getByText('Contenido de prueba')).toBeTruthy();
  });

  it('muestra el sentinel cuando hasMore=true', () => {
    render(
      <ScrollPage hasMore={true} onLoadMore={vi.fn()}>
        <p>Items</p>
      </ScrollPage>
    );
    expect(screen.getByTestId('scroll-page-sentinel')).toBeTruthy();
  });

  it('no muestra el sentinel cuando hasMore=false', () => {
    render(
      <ScrollPage hasMore={false}>
        <p>Items</p>
      </ScrollPage>
    );
    expect(screen.queryByTestId('scroll-page-sentinel')).toBeNull();
  });

  it('muestra el spinner cuando loadingMore=true', async () => {
    render(
      <ScrollPage loadingMore={true} hasMore={true}>
        <p>Items</p>
      </ScrollPage>
    );
    expect(screen.getByTestId('scroll-page-spinner')).toBeTruthy();
  });

  it('no muestra el spinner cuando loadingMore=false', () => {
    render(
      <ScrollPage loadingMore={false}>
        <p>Items</p>
      </ScrollPage>
    );
    expect(screen.queryByTestId('scroll-page-spinner')).toBeNull();
  });

  it('muestra la etiqueta personalizada del spinner', () => {
    render(
      <ScrollPage loadingMore={true} loadingMoreLabel="Cargando más productos...">
        <p>Items</p>
      </ScrollPage>
    );
    expect(screen.getByText('Cargando más productos...')).toBeTruthy();
  });
});
