/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';

describe('Smoke test harness', () => {
  it('renders a basic React component', () => {
    function Hello() { return <div>Hello Smoke</div>; }
    render(<Hello />);
    expect(screen.getByText('Hello Smoke')).toBeInTheDocument();
  });
});
