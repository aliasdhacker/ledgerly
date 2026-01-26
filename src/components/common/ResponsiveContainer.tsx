// ResponsiveContainer - Adaptive layout container for responsive designs
// Automatically handles padding, max-width, and centering based on device

import React from 'react';
import { View, StyleSheet, ViewStyle, ScrollView } from 'react-native';
import { useDevice } from '../../hooks/useDevice';
import { maxContentWidth, containerPadding } from '../../utils/responsive';

// ============================================================================
// Types
// ============================================================================

interface ResponsiveContainerProps {
  children: React.ReactNode;
  /** Maximum width of content (default: 800) */
  maxWidth?: number;
  /** Additional padding beyond device default */
  extraPadding?: number;
  /** Disable horizontal padding */
  noPadding?: boolean;
  /** Center content horizontally on large screens */
  center?: boolean;
  /** Make container scrollable */
  scrollable?: boolean;
  /** Custom style */
  style?: ViewStyle;
  /** Content container style (for scrollable) */
  contentContainerStyle?: ViewStyle;
}

// ============================================================================
// Component
// ============================================================================

/**
 * A container that adapts to device size and handles responsive layout.
 * Automatically applies appropriate padding and max-width.
 *
 * @example
 * // Basic usage
 * <ResponsiveContainer>
 *   <YourContent />
 * </ResponsiveContainer>
 *
 * @example
 * // Scrollable with max width
 * <ResponsiveContainer scrollable maxWidth={600}>
 *   <LongContent />
 * </ResponsiveContainer>
 */
export function ResponsiveContainer({
  children,
  maxWidth = 800,
  extraPadding = 0,
  noPadding = false,
  center = true,
  scrollable = false,
  style,
  contentContainerStyle,
}: ResponsiveContainerProps) {
  const device = useDevice();

  const padding = noPadding ? 0 : containerPadding(device) + extraPadding;
  const contentWidth = maxContentWidth(device, maxWidth);
  const shouldCenter = center && device.isTablet && contentWidth < device.width;

  const containerStyle: ViewStyle = {
    flex: 1,
    paddingHorizontal: padding,
    ...(shouldCenter && {
      alignItems: 'center',
    }),
  };

  const innerStyle: ViewStyle = {
    width: shouldCenter ? contentWidth : '100%',
    maxWidth: maxWidth,
  };

  if (scrollable) {
    return (
      <ScrollView
        style={[styles.scroll, containerStyle, style]}
        contentContainerStyle={[
          styles.scrollContent,
          innerStyle,
          contentContainerStyle,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    );
  }

  return (
    <View style={[styles.container, containerStyle, style]}>
      <View style={innerStyle}>{children}</View>
    </View>
  );
}

// ============================================================================
// MasterDetailContainer
// ============================================================================

interface MasterDetailContainerProps {
  /** Master/list panel content */
  master: React.ReactNode;
  /** Detail panel content (shown when item selected) */
  detail: React.ReactNode;
  /** Whether detail view is currently showing (for phone navigation) */
  showDetail?: boolean;
  /** Master panel width ratio on tablets (default: 0.35) */
  masterRatio?: number;
  /** Custom styles */
  style?: ViewStyle;
  masterStyle?: ViewStyle;
  detailStyle?: ViewStyle;
}

/**
 * A container for master-detail layouts (list + detail view).
 * On tablets in landscape: shows side-by-side.
 * On phones or portrait: shows one at a time.
 *
 * @example
 * <MasterDetailContainer
 *   master={<AccountList onSelect={setSelected} />}
 *   detail={<AccountDetail account={selected} />}
 *   showDetail={!!selected}
 * />
 */
export function MasterDetailContainer({
  master,
  detail,
  showDetail = false,
  masterRatio = 0.35,
  style,
  masterStyle,
  detailStyle,
}: MasterDetailContainerProps) {
  const device = useDevice();
  const isSideBySide = device.isTablet && device.isLandscape;

  if (isSideBySide) {
    const masterWidth = Math.round(device.width * masterRatio);

    return (
      <View style={[styles.masterDetailRow, style]}>
        <View style={[styles.masterPanel, { width: masterWidth }, masterStyle]}>
          {master}
        </View>
        <View style={[styles.divider]} />
        <View style={[styles.detailPanel, { flex: 1 }, detailStyle]}>
          {detail}
        </View>
      </View>
    );
  }

  // Stacked layout (phone or tablet portrait)
  return (
    <View style={[styles.container, style]}>
      {showDetail ? detail : master}
    </View>
  );
}

// ============================================================================
// GridContainer
// ============================================================================

interface GridContainerProps {
  children: React.ReactNode;
  /** Minimum width for each item (grid will calculate columns) */
  minItemWidth?: number;
  /** Gap between items */
  gap?: number;
  /** Custom style */
  style?: ViewStyle;
}

/**
 * A container that arranges children in a responsive grid.
 * Automatically calculates column count based on available width.
 *
 * @example
 * <GridContainer minItemWidth={160}>
 *   {items.map(item => <Card key={item.id} {...item} />)}
 * </GridContainer>
 */
export function GridContainer({
  children,
  minItemWidth = 160,
  gap = 16,
  style,
}: GridContainerProps) {
  const device = useDevice();

  const availableWidth = device.width - (device.padding * 2);
  const columns = Math.max(1, Math.floor((availableWidth + gap) / (minItemWidth + gap)));
  const itemWidth = (availableWidth - (gap * (columns - 1))) / columns;

  return (
    <View style={[styles.grid, { gap }, style]}>
      {React.Children.map(children, (child, index) => (
        <View key={index} style={{ width: itemWidth }}>
          {child}
        </View>
      ))}
    </View>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  masterDetailRow: {
    flex: 1,
    flexDirection: 'row',
  },
  masterPanel: {
    backgroundColor: '#f8f9fa',
  },
  detailPanel: {
    flex: 1,
  },
  divider: {
    width: 1,
    backgroundColor: '#e1e4e8',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});

export default ResponsiveContainer;
