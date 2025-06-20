export const createClientComponentClient = jest.fn(() => ({
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(),
      })),
      order: jest.fn(() => ({ // Add the 'order' method here
        eq: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
    })),
    insert: jest.fn(() => ({ // Mock the 'insert' method
      select: jest.fn(() => ({ // Mock the 'select' method after 'insert'
        single: jest.fn(), // Mock the 'single' method after 'select'
      })),
    })),
    update: jest.fn(() => ({ // Mock the 'update' method
      eq: jest.fn(() => ({ // Mock the 'eq' method after 'update'
        select: jest.fn(() => ({ // Mock the 'select' method after 'eq'
          single: jest.fn(), // Mock the 'single' method after 'select'
        })),
      })),
    })),
    delete: jest.fn(() => ({ // Mock the 'delete' method
      eq: jest.fn(), // Mock the 'eq' method after 'delete'
    })),
  })),
  auth: {
    getSession: jest.fn(),
    onAuthStateChange: jest.fn(() => ({
      data: {
        subscription: {
          unsubscribe: jest.fn(),
        },
      },
    })),
  },
}));
