'use client'

import React from 'react'
import { render, screen } from '@testing-library/react'
import PartNumberDialog from '../PartNumberDialog'

describe('PartNumberDialog', () => {
  it('renders the button', () => {
    render(<PartNumberDialog />)
    expect(screen.getByRole('button', { name: /add part number/i })).toBeInTheDocument()
  })
})
