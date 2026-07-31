import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renderiza el contenido', () => {
    render(<Button>Guardar</Button>);
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeInTheDocument();
  });

  it('se deshabilita mientras carga', () => {
    render(<Button loading>Guardar</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('dispara onClick', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Ir</Button>);
    screen.getByRole('button').click();
    expect(onClick).toHaveBeenCalledOnce();
  });
});
