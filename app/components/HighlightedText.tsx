import React from 'react';
import { Text, TextStyle, StyleSheet } from 'react-native';
import { getMatchIndices } from '../utils/searchUtils';
import { COLORS } from '../utils';

interface HighlightedTextProps {
  text: string;
  searchQuery: string;
  style?: TextStyle | TextStyle[];
  highlightStyle?: TextStyle;
  numberOfLines?: number;
}

const HighlightedText: React.FC<HighlightedTextProps> = ({
  text,
  searchQuery,
  style,
  highlightStyle,
  numberOfLines,
}) => {
  // If no search query, return plain text
  if (!searchQuery || !text) {
    return (
      <Text style={style} numberOfLines={numberOfLines}>
        {text}
      </Text>
    );
  }

  // Get indices of matching portions
  const matchIndices = getMatchIndices(text, searchQuery);

  // If no matches, return plain text
  if (matchIndices.length === 0) {
    return (
      <Text style={style} numberOfLines={numberOfLines}>
        {text}
      </Text>
    );
  }

  // Build text parts with highlighting
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  // Sort indices to ensure proper order
  const sortedIndices = matchIndices.sort((a, b) => a[0] - b[0]);

  sortedIndices.forEach(([start, end], index) => {
    // Add text before match
    if (start > lastIndex) {
      parts.push(
        <Text key={`text-${index}`}>
          {text.substring(lastIndex, start)}
        </Text>
      );
    }

    // Add highlighted match
    parts.push(
      <Text
        key={`highlight-${index}`}
        style={[styles.highlight, highlightStyle]}
      >
        {text.substring(start, end)}
      </Text>
    );

    lastIndex = end;
  });

  // Add remaining text after last match
  if (lastIndex < text.length) {
    parts.push(
      <Text key="text-end">
        {text.substring(lastIndex)}
      </Text>
    );
  }

  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {parts}
    </Text>
  );
};

const styles = StyleSheet.create({
  highlight: {
    backgroundColor: '#FFEB3B', // Yellow highlight
    fontWeight: '600',
    color: '#000000',
  },
});

export default HighlightedText;
