declare module '@bolt/ui' {
  import React from 'react';

  // Layout Components
  export namespace Layout {
    interface GridProps {
      cols?: number;
      gap?: number;
      className?: string;
      children?: React.ReactNode;
    }
    export const Grid: React.FC<GridProps>;

    interface GridItemProps {
      span?: number;
      className?: string;
      children?: React.ReactNode;
    }
    export const GridItem: React.FC<GridItemProps>;

    interface PanelProps {
      id: string;
      span?: number;
      priority?: number;
      resizable?: boolean;
      minWidth?: number;
      maxWidth?: number;
      defaultWidth?: number;
      onResize?: (width: number) => void;
      collapsible?: boolean;
      defaultCollapsed?: boolean;
      className?: string;
      children?: React.ReactNode;
    }
    export const Panel: React.FC<PanelProps>;

    interface ManagerProps {
      layout?: string;
      breakpoints?: Record<string, any>;
      className?: string;
      children?: React.ReactNode;
    }
    export const Manager: React.FC<ManagerProps>;
  }

  // Video Components
  export namespace Video {
    interface PlayerProps {
      src: string;
      autoPlay?: boolean;
      controls?: boolean;
      muted?: boolean;
      volume?: number;
      allowFullScreen?: boolean;
      className?: string;
    }
    export const Player: React.FC<PlayerProps>;

    interface ContainerProps {
      aspectRatio?: string;
      className?: string;
      ref?: React.Ref<HTMLDivElement>;
      onMouseMove?: () => void;
      onMouseLeave?: () => void;
      children?: React.ReactNode;
    }
    export const Container: React.FC<ContainerProps>;

    interface OverlayProps {
      position?: 'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
      padding?: number;
      className?: string;
      children?: React.ReactNode;
    }
    export const Overlay: React.FC<OverlayProps>;
  }

  // Control Components
  export namespace Control {
    interface PanelProps {
      title?: string;
      children?: React.ReactNode;
    }
    export const Panel: React.FC<PanelProps>;

    interface GroupProps {
      label?: string;
      children?: React.ReactNode;
    }
    export const Group: React.FC<GroupProps>;

    export const Divider: React.FC;
  }

  // Chat Components
  export namespace Chat {
    interface ContainerProps {
      className?: string;
      children?: React.ReactNode;
    }
    export const Container: React.FC<ContainerProps>;

    interface HeaderProps {
      className?: string;
      children?: React.ReactNode;
    }
    export const Header: React.FC<HeaderProps>;

    interface MessageListProps {
      className?: string;
      children?: React.ReactNode;
    }
    export const MessageList: React.FC<MessageListProps>;

    interface MessageProps {
      key?: string;
      className?: string;
      children?: React.ReactNode;
    }
    export const Message: React.FC<MessageProps>;

    interface InputProps {
      className?: string;
      children?: React.ReactNode;
    }
    export const Input: React.FC<InputProps>;
  }

  // Navigation Components
  export namespace Navigation {
    interface BarProps {
      sticky?: boolean;
      className?: string;
      children?: React.ReactNode;
    }
    export const Bar: React.FC<BarProps>;

    interface BrandProps {
      children?: React.ReactNode;
    }
    export const Brand: React.FC<BrandProps>;

    interface MenuProps {
      className?: string;
      children?: React.ReactNode;
    }
    export const Menu: React.FC<MenuProps>;

    interface ItemProps {
      href?: string;
      active?: boolean;
      className?: string;
      children?: React.ReactNode;
    }
    export const Item: React.FC<ItemProps>;

    interface SearchProps {
      className?: string;
      children?: React.ReactNode;
    }
    export const Search: React.FC<SearchProps>;

    interface ActionsProps {
      className?: string;
      children?: React.ReactNode;
    }
    export const Actions: React.FC<ActionsProps>;
  }

  // Common Components
  export interface ButtonProps {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
    size?: 'xs' | 'sm' | 'md' | 'lg';
    fullWidth?: boolean;
    disabled?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    as?: React.ElementType;
    to?: string;
    href?: string;
    onClick?: (e: React.MouseEvent) => void;
    className?: string;
    children?: React.ReactNode;
  }
  export const Button: React.FC<ButtonProps>;

  export interface IconButtonProps {
    icon: string;
    variant?: 'primary' | 'secondary' | 'ghost';
    size?: 'xs' | 'sm' | 'md' | 'lg';
    onClick?: (e: React.MouseEvent) => void;
    className?: string;
  }
  export const IconButton: React.FC<IconButtonProps>;

  export interface CardProps {
    hoverable?: boolean;
    className?: string;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
    children?: React.ReactNode;
  }
  export const Card: React.FC<CardProps> & {
    Header: React.FC<{ children?: React.ReactNode; className?: string }>;
    Body: React.FC<{ children?: React.ReactNode; className?: string }>;
    Footer: React.FC<{ children?: React.ReactNode; className?: string }>;
    Media: React.FC<{ children?: React.ReactNode; className?: string }>;
    MediaOverlay: React.FC<{ position?: string; children?: React.ReactNode; className?: string }>;
    Title: React.FC<{ children?: React.ReactNode; className?: string }>;
  };

  export interface BadgeProps {
    variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'default' | 'outline';
    size?: 'xs' | 'sm' | 'md';
    pulse?: boolean;
    className?: string;
    children?: React.ReactNode;
  }
  export const Badge: React.FC<BadgeProps>;

  export interface AvatarProps {
    src?: string;
    name?: string;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  }
  export const Avatar: React.FC<AvatarProps>;

  export interface IconProps {
    name: string;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
  }
  export const Icon: React.FC<IconProps>;

  export interface InputProps {
    type?: string;
    placeholder?: string;
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onKeyPress?: (e: React.KeyboardEvent) => void;
    leftIcon?: React.ReactNode;
    rightElement?: React.ReactNode;
    maxLength?: number;
    className?: string;
  }
  export const Input: React.FC<InputProps>;

  export interface TextProps {
    variant?: 'default' | 'muted' | 'error' | 'warning';
    size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl';
    weight?: 'light' | 'regular' | 'medium' | 'semibold' | 'bold';
    className?: string;
    children?: React.ReactNode;
  }
  export const Text: React.FC<TextProps>;

  export interface HeadingProps {
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
    className?: string;
    children?: React.ReactNode;
  }
  export const Heading: React.FC<HeadingProps>;

  export interface SwitchProps {
    label?: string;
    checked?: boolean;
    defaultChecked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
  }
  export const Switch: React.FC<SwitchProps>;

  export interface SelectProps {
    value?: string;
    onValueChange?: (value: string) => void;
    options?: Array<{ value: string; label: string | React.ReactNode }>;
    size?: 'sm' | 'md' | 'lg';
  }
  export const Select: React.FC<SelectProps>;

  export interface SliderProps {
    value?: number[];
    onValueChange?: (value: number[]) => void;
    max?: number;
    min?: number;
    step?: number;
    className?: string;
  }
  export const Slider: React.FC<SliderProps>;

  export interface TabsProps {
    defaultValue?: string;
    children?: React.ReactNode;
  }
  export const Tabs: React.FC<TabsProps> & {
    List: React.FC<{ children?: React.ReactNode }>;
    Trigger: React.FC<{ value: string; children?: React.ReactNode }>;
    Content: React.FC<{ value: string; className?: string; children?: React.ReactNode }>;
  };

  export interface CarouselProps {
    items: any[];
    itemsPerView?: { base?: number; sm?: number; md?: number; lg?: number; xl?: number };
    spacing?: number;
    autoPlay?: boolean;
    loop?: boolean;
    showControls?: boolean;
    showIndicators?: boolean;
    className?: string;
    children: (item: any) => React.ReactNode;
  }
  export const Carousel: React.FC<CarouselProps>;

  export interface ImageProps {
    src: string;
    alt: string;
    aspectRatio?: string;
    objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
    className?: string;
    style?: React.CSSProperties;
  }
  export const Image: React.FC<ImageProps>;

  export interface PriceProps {
    value: number;
    currency: string;
    size?: 'sm' | 'md' | 'lg';
    showOriginal?: boolean;
    originalValue?: number;
    className?: string;
  }
  export const Price: React.FC<PriceProps>;

  export interface TimerProps {
    endTime: Date;
    format?: string;
    onExpire?: () => void;
    className?: string;
  }
  export const Timer: React.FC<TimerProps>;

  export interface TooltipProps {
    content: string;
    children: React.ReactElement;
  }
  export const Tooltip: React.FC<TooltipProps>;

  export interface DropdownProps {
    children?: React.ReactNode;
  }
  export const Dropdown: React.FC<DropdownProps> & {
    Trigger: React.FC<{ children?: React.ReactNode }>;
    Menu: React.FC<{ align?: 'start' | 'center' | 'end'; className?: string; children?: React.ReactNode }>;
    Item: React.FC<{ as?: React.ElementType; to?: string; onClick?: () => void; className?: string; children?: React.ReactNode }>;
    Header: React.FC<{ children?: React.ReactNode }>;
    Separator: React.FC;
  };

  export interface ScrollAreaProps {
    className?: string;
    ref?: React.Ref<HTMLDivElement>;
    onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
    children?: React.ReactNode;
  }
  export const ScrollArea: React.FC<ScrollAreaProps>;

  export interface OverlayProps {
    className?: string;
    children?: React.ReactNode;
  }
  export const Overlay: React.FC<OverlayProps>;

  export interface SidebarProps {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    side?: 'left' | 'right';
    className?: string;
    children?: React.ReactNode;
  }
  export const Sidebar: React.FC<SidebarProps> & {
    Header: React.FC<{ children?: React.ReactNode }>;
    Content: React.FC<{ children?: React.ReactNode }>;
    Section: React.FC<{ title?: string; children?: React.ReactNode }>;
    Item: React.FC<{ as?: React.ElementType; to?: string; active?: boolean; onClick?: () => void; children?: React.ReactNode }>;
    Footer: React.FC<{ children?: React.ReactNode }>;
  };

  export const Logo: React.FC<{ size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' }>;
  export const Divider: React.FC<{ className?: string }>;

  export interface EmojiPickerProps {
    onEmojiSelect: (emoji: string) => void;
    onClose: () => void;
  }
  export const EmojiPicker: React.FC<EmojiPickerProps>;

  export namespace FullScreen {
    export const Exit: React.FC<{ onClick?: () => void; className?: string }>;
  }

  // Provider
  export interface BoltProviderProps {
    theme?: any;
    children?: React.ReactNode;
  }
  export const BoltProvider: React.FC<BoltProviderProps>;

  // Hooks
  export function useToast(): (options: { title: string; description?: string; variant?: string }) => void;
}

declare module '@bolt/themes' {
  export interface ThemeConfig {
    name?: string;
    colors?: any;
    typography?: any;
    spacing?: any;
    radius?: any;
    shadows?: any;
    transitions?: any;
    breakpoints?: any;
    components?: any;
    darkMode?: any;
    animations?: any;
  }

  export function createTheme(config: ThemeConfig): any;
}

declare module '@bolt/icons' {
  export * from '@bolt/ui';
}