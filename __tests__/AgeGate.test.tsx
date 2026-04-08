import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import AgeGate from '@/components/AgeGate';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Selects a value from one of the three date dropdowns by its label text. */
async function selectField(label: string, value: string) {
  const select = screen.getByRole('combobox', { name: label });
  await userEvent.selectOptions(select, value);
}

/** Fills all three date fields and submits the form. */
async function submitDob(month: string, day: string, year: string) {
  await selectField('Month', month);
  await selectField('Day', day);
  await selectField('Year', year);
  await userEvent.click(screen.getByRole('button', { name: /verify age/i }));
}

// ─── Rendering ────────────────────────────────────────────────────────────────

describe('AgeGate — rendering', () => {
  it('renders the heading and description', () => {
    render(<AgeGate minAge={18} onAgeVerified={vi.fn()} />);
    expect(screen.getByRole('heading', { name: /age verification/i })).toBeInTheDocument();
    expect(screen.getByText(/you must be 18 or older/i)).toBeInTheDocument();
  });

  it('renders three labelled dropdowns', () => {
    render(<AgeGate minAge={18} onAgeVerified={vi.fn()} />);
    expect(screen.getByRole('combobox', { name: /month/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /day/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /year/i })).toBeInTheDocument();
  });

  it('renders the default submit button label', () => {
    render(<AgeGate minAge={18} onAgeVerified={vi.fn()} />);
    expect(screen.getByRole('button', { name: /verify age/i })).toBeInTheDocument();
  });

  it('renders a custom submit button label when provided', () => {
    render(<AgeGate minAge={21} onAgeVerified={vi.fn()} submitButtonText="Confirm My Age" />);
    expect(screen.getByRole('button', { name: /confirm my age/i })).toBeInTheDocument();
  });

  it('shows the correct minAge in the description', () => {
    render(<AgeGate minAge={21} onAgeVerified={vi.fn()} />);
    expect(screen.getByText(/you must be 21 or older/i)).toBeInTheDocument();
  });

  it('does not show an error message on initial render', () => {
    render(<AgeGate minAge={18} onAgeVerified={vi.fn()} />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

// ─── Disabled state ───────────────────────────────────────────────────────────

describe('AgeGate — disabled prop', () => {
  it('disables all controls when disabled=true', () => {
    render(<AgeGate minAge={18} onAgeVerified={vi.fn()} disabled />);
    expect(screen.getByRole('combobox', { name: /month/i })).toBeDisabled();
    expect(screen.getByRole('combobox', { name: /day/i })).toBeDisabled();
    expect(screen.getByRole('combobox', { name: /year/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /verify age/i })).toBeDisabled();
  });

  it('enables all controls when disabled=false', () => {
    render(<AgeGate minAge={18} onAgeVerified={vi.fn()} disabled={false} />);
    expect(screen.getByRole('button', { name: /verify age/i })).not.toBeDisabled();
  });
});

// ─── Empty-input validation ───────────────────────────────────────────────────

describe('AgeGate — empty input validation', () => {
  it('shows an error and does not fire onAgeVerified when all fields are empty', async () => {
    const onAgeVerified = vi.fn();
    render(<AgeGate minAge={18} onAgeVerified={onAgeVerified} />);
    await userEvent.click(screen.getByRole('button', { name: /verify age/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/complete date of birth/i);
    expect(onAgeVerified).not.toHaveBeenCalled();
  });

  it('shows an error when only month is selected', async () => {
    render(<AgeGate minAge={18} onAgeVerified={vi.fn()} />);
    await selectField('Month', 'January');
    await userEvent.click(screen.getByRole('button', { name: /verify age/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/complete date of birth/i);
  });

  it('shows an error when only month and day are selected', async () => {
    render(<AgeGate minAge={18} onAgeVerified={vi.fn()} />);
    await selectField('Month', 'January');
    await selectField('Day', '1');
    await userEvent.click(screen.getByRole('button', { name: /verify age/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/complete date of birth/i);
  });
});

// ─── Future date validation ───────────────────────────────────────────────────

describe('AgeGate — future date validation', () => {
  it('shows an error when dob is in the future', async () => {
    // The year dropdown caps at the current year, so we pick Dec 31 of this
    // year — that date is in the future unless today actually is Dec 31.
    const currentYear = String(new Date().getFullYear());
    render(<AgeGate minAge={18} onAgeVerified={vi.fn()} />);
    await submitDob('December', '31', currentYear);
    expect(screen.getByRole('alert')).toHaveTextContent(/cannot be in the future/i);
  });
});

// ─── Age verification — passing ───────────────────────────────────────────────

describe('AgeGate — age verified', () => {
  it('calls onAgeVerified and hides the error when age qualifies', async () => {
    const onAgeVerified = vi.fn();
    render(<AgeGate minAge={18} onAgeVerified={onAgeVerified} />);
    // Someone born 30 years ago easily clears the 18 minimum
    const year = String(new Date().getFullYear() - 30);
    await submitDob('January', '1', year);
    expect(onAgeVerified).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('calls onAgeVerified when age exactly equals minAge today', async () => {
    const onAgeVerified = vi.fn();
    render(<AgeGate minAge={18} onAgeVerified={onAgeVerified} />);
    const now = new Date();
    const year = String(now.getFullYear() - 18);
    const month = now.toLocaleString('default', { month: 'long' });
    const day = String(now.getDate());
    await submitDob(month, day, year);
    expect(onAgeVerified).toHaveBeenCalledTimes(1);
  });
});

// ─── Age verification — failing ───────────────────────────────────────────────

describe('AgeGate — age denied', () => {
  it('shows the default error message when under age', async () => {
    const onAgeDenied = vi.fn();
    render(<AgeGate minAge={18} onAgeVerified={vi.fn()} onAgeDenied={onAgeDenied} />);
    const year = String(new Date().getFullYear() - 10);
    await submitDob('January', '1', year);
    expect(screen.getByRole('alert')).toHaveTextContent(/at least 18 years old/i);
    expect(onAgeDenied).toHaveBeenCalledTimes(1);
  });

  it('shows a custom error message when provided', async () => {
    render(
      <AgeGate
        minAge={18}
        onAgeVerified={vi.fn()}
        errorMessage="Sorry, you're too young for this content."
      />
    );
    const year = String(new Date().getFullYear() - 10);
    await submitDob('January', '1', year);
    expect(screen.getByRole('alert')).toHaveTextContent(/too young for this content/i);
  });

  it('does not call onAgeVerified when under age', async () => {
    const onAgeVerified = vi.fn();
    render(<AgeGate minAge={18} onAgeVerified={onAgeVerified} />);
    const year = String(new Date().getFullYear() - 10);
    await submitDob('January', '1', year);
    expect(onAgeVerified).not.toHaveBeenCalled();
  });

  it('shows error when born one day before reaching minAge', async () => {
    const onAgeDenied = vi.fn();
    render(<AgeGate minAge={18} onAgeVerified={vi.fn()} onAgeDenied={onAgeDenied} />);
    const now = new Date();
    // Birthday is tomorrow → still 17 today
    const dobTomorrow = new Date(now.getFullYear() - 18, now.getMonth(), now.getDate() + 1);
    const month = dobTomorrow.toLocaleString('default', { month: 'long' });
    const day = String(dobTomorrow.getDate());
    const year = String(dobTomorrow.getFullYear());
    await submitDob(month, day, year);
    expect(onAgeDenied).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});

// ─── Dynamic day list ─────────────────────────────────────────────────────────

describe('AgeGate — dynamic day list', () => {
  it('offers 31 days for January', async () => {
    render(<AgeGate minAge={18} onAgeVerified={vi.fn()} />);
    await selectField('Month', 'January');
    const daySelect = screen.getByRole('combobox', { name: /day/i });
    // 31 real days + 1 placeholder option
    expect(within(daySelect).getAllByRole('option')).toHaveLength(32);
  });

  it('offers 30 days for April (requires year selected to constrain days)', async () => {
    // maxDays is only constrained when BOTH month and year are set
    render(<AgeGate minAge={18} onAgeVerified={vi.fn()} />);
    await selectField('Month', 'April');
    await selectField('Year', '2025');
    const daySelect = screen.getByRole('combobox', { name: /day/i });
    expect(within(daySelect).getAllByRole('option')).toHaveLength(31); // 30 days + placeholder
  });

  it('offers 28 days for February in a non-leap year', async () => {
    render(<AgeGate minAge={18} onAgeVerified={vi.fn()} />);
    await selectField('Month', 'February');
    await selectField('Year', '2025'); // 2025 is not a leap year
    const daySelect = screen.getByRole('combobox', { name: /day/i });
    expect(within(daySelect).getAllByRole('option')).toHaveLength(29); // 28 + placeholder
  });

  it('offers 29 days for February in a leap year', async () => {
    render(<AgeGate minAge={18} onAgeVerified={vi.fn()} />);
    await selectField('Month', 'February');
    await selectField('Year', '2000'); // 2000 is a leap year
    const daySelect = screen.getByRole('combobox', { name: /day/i });
    expect(within(daySelect).getAllByRole('option')).toHaveLength(30); // 29 + placeholder
  });

  it('resets day selection when month changes to one with fewer days', async () => {
    render(<AgeGate minAge={18} onAgeVerified={vi.fn()} />);
    // Year must be set first — the reset guard requires both month AND year
    // to be present before it can call daysInMonth to compare
    await selectField('Month', 'January');
    await selectField('Year', '2025');
    await selectField('Day', '31');
    expect(screen.getByRole('combobox', { name: /day/i })).toHaveValue('31');
    // Switch to April (30 days) — day 31 is now invalid, should reset to ''
    await selectField('Month', 'April');
    expect(screen.getByRole('combobox', { name: /day/i })).toHaveValue('');
  });
});

// ─── Error clearing ───────────────────────────────────────────────────────────

describe('AgeGate — error clears on input change', () => {
  it('clears the error message when the user changes any dropdown after a failed submit', async () => {
    render(<AgeGate minAge={18} onAgeVerified={vi.fn()} />);
    // Trigger an error
    await userEvent.click(screen.getByRole('button', { name: /verify age/i }));
    expect(screen.getByRole('alert')).toBeInTheDocument();
    // Change any field — error should disappear
    await selectField('Month', 'January');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

// ─── Accessibility ────────────────────────────────────────────────────────────

describe('AgeGate — accessibility', () => {
  it('associates the error with the selects via aria-describedby', async () => {
    render(<AgeGate minAge={18} onAgeVerified={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /verify age/i }));
    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('id', 'age-gate-error');
    // Each empty select should point to the error
    const selects = screen.getAllByRole('combobox');
    selects.forEach((s) => {
      expect(s).toHaveAttribute('aria-describedby', 'age-gate-error');
    });
  });

  it('marks empty selects as aria-invalid after a failed submit', async () => {
    render(<AgeGate minAge={18} onAgeVerified={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /verify age/i }));
    const selects = screen.getAllByRole('combobox');
    selects.forEach((s) => {
      expect(s).toHaveAttribute('aria-invalid', 'true');
    });
  });

  it('renders the form with an accessible label', () => {
    render(<AgeGate minAge={18} onAgeVerified={vi.fn()} />);
    expect(screen.getByRole('form', { name: /age verification form/i })).toBeInTheDocument();
  });
});
