import { beforeEach, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderAt, signInAs } from '../../test/utils';
import { server } from '../../mocks/server';
import { ChatPanel } from './ChatPanel';
import { newChat } from './conversationStore';

const API = '*/api/v1/assistant/chat/stream';

function typeAndSend(text: string) {
  const user = userEvent.setup();
  return user.type(screen.getByLabelText('Ask Aura a question'), `${text}{Enter}`);
}

describe('ChatPanel', () => {
  beforeEach(() => {
    signInAs('asha');
    newChat();
  });

  it('streams a reply, shows the tool indicator, and renders product cards from the links', async () => {
    renderAt(<ChatPanel />, { route: '/assistant' });
    await typeAndSend('I need something to keep tea hot on a long train trip');

    expect(await screen.findByText('Searching the catalogue…')).toBeInTheDocument();
    expect(
      await screen.findByText(/Here is what I found/, undefined, { timeout: 5000 }),
    ).toBeInTheDocument();
    await waitFor(
      () => {
        expect(screen.getAllByRole('button', { name: 'Add to cart' }).length).toBeGreaterThan(0);
      },
      { timeout: 8000 },
    );
    // The reply text links to the product, and the product card repeats the link.
    const links = screen.getAllByRole('link', { name: 'Steel Vacuum Flask 750ml' });
    expect(links.length).toBeGreaterThanOrEqual(2);
    for (const link of links) {
      expect(link).toHaveAttribute('href', '/products/0b9a7c1e-0003-4c3a-9a10-000000000003');
    }
  });

  it('stops a reply part-way and keeps the text received so far', async () => {
    const user = userEvent.setup();
    renderAt(<ChatPanel />, { route: '/assistant' });
    await typeAndSend('Suggest earbuds under ₹5,000 for the gym');
    await screen.findByText(/Here are options under/, undefined, { timeout: 5000 });
    await user.click(screen.getByRole('button', { name: 'Stop the reply' }));
    expect(await screen.findByText('Stopped.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send' })).toBeInTheDocument();
  });

  it('shows an error with Retry when the assistant is unavailable, and recovers on retry', async () => {
    const user = userEvent.setup();
    server.use(
      http.post(API, () =>
        HttpResponse.json(
          {
            type: 'https://auramart.dev/problems/service-unavailable',
            title: 'Service unavailable',
            status: 503,
            detail: 'The assistant is down',
          },
          { status: 503, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    );
    renderAt(<ChatPanel />, { route: '/assistant' });
    await typeAndSend('Hi');
    expect(await screen.findByText('The assistant is down')).toBeInTheDocument();

    server.resetHandlers();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(
      await screen.findByText(/Hi, I am Aura/, undefined, { timeout: 5000 }),
    ).toBeInTheDocument();
  });

  it('caps the message at 1000 characters and counts them', async () => {
    const user = userEvent.setup();
    renderAt(<ChatPanel />, { route: '/assistant' });
    const input = screen.getByLabelText('Ask Aura a question');
    await user.click(input);
    await user.paste('x'.repeat(1000));
    expect(screen.getByText(/1000\/1000/)).toBeInTheDocument();
  });
});
