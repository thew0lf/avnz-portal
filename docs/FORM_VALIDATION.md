Modern Form Validation & Error Handling Guidelines

Schema-first validation
- Define Zod schemas for every form (required, min/max, patterns) with friendly messages.
- Keep all validation logic in the schema for consistency and reuse.

React Hook Form integration
- Use react-hook-form with zodResolver for client-side validation.
- Set useForm({ mode: 'onSubmit' }) to delay errors until submission; optionally show per-field errors on blur/change after first submit.

shadcn/ui components
- Use <FormItem>, <FormLabel>, <FormControl>, <FormMessage>, <FormDescription> alongside inputs.
- Ensure every field has a label, optional description, and <FormMessage> for errors.
- Provide aria-invalid and aria-describedby for accessibility.

Aggregate / non-field errors
- Render overall form errors (e.g. server failures) above the submit button or the form header.
- Map server field errors back into RHF formState for <FormMessage> display.

Accessibility & UX
- Focus the first invalid field after submit.
- Use clear, helpful messages (e.g., password must include uppercase, lowercase, digit, symbol).
- Avoid showing errors while typing unless helpful; prefer onBlur/onSubmit.

Server-side validation
- Always validate on server (duplicate checks, race conditions) and return structured errors that can be mapped to fields.

Testing
- Write unit/integration tests for invalid inputs, server error flows, dynamic arrays, etc.
- Consider visual regression snapshots for error display.

