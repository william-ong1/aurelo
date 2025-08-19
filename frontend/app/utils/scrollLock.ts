// Utility functions to prevent background scrolling when modals are open

export const disableBodyScroll = () => {
  if (typeof document !== 'undefined') {
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = '0px'; // Prevent layout shift
  }
};

export const enableBodyScroll = () => {
  if (typeof document !== 'undefined') {
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
  }
};
