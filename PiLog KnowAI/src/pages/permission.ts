export const ROLE_PERMISSIONS = {
  admin: {
    delete: true,
    add: true,
    refresh: true,
  },
  editor: {
    delete: false,
    add: true,
    refresh: true,
  },
  viewer: {
    delete: false,
    add: false,
    refresh: true,
  },
};
