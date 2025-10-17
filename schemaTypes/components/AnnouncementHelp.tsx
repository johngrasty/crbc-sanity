import React from 'react';
import { Card, Stack, Text, Box, Heading } from '@sanity/ui';

export function AnnouncementHelp() {
  return (
    <Card padding={4} radius={2} shadow={1} tone="primary">
      <Stack space={4}>
        <Heading size={1}>📢 Quick Guide: Managing Announcements</Heading>
        
        <Stack space={3}>
          <Box>
            <Text size={1} weight="semibold">Priority Levels:</Text>
            <Stack space={2} marginTop={2}>
              <Text size={1}>• 9-10: Emergency/Urgent</Text>
              <Text size={1}>• 7-8: Major Events</Text>
              <Text size={1}>• 5-6: Regular Updates</Text>
              <Text size={1}>• 3-4: General Info</Text>
              <Text size={1}>• 1-2: Low Priority</Text>
            </Stack>
          </Box>
          
          <Box>
            <Text size={1} weight="semibold">Status Indicators:</Text>
            <Stack space={2} marginTop={2}>
              <Text size={1}>✅ Active - Currently showing</Text>
              <Text size={1}>⏰ Scheduled - Future display</Text>
              <Text size={1}>⏹️ Expired - Past end date</Text>
              <Text size={1}>⏸️ Inactive - Manually off</Text>
            </Stack>
          </Box>
          
          <Box>
            <Text size={1} weight="semibold">Best Practices:</Text>
            <Stack space={2} marginTop={2}>
              <Text size={1}>• Keep titles under 100 characters</Text>
              <Text size={1}>• Descriptions: 100-150 characters</Text>
              <Text size={1}>• Images: 1200x600px recommended</Text>
              <Text size={1}>• Set end dates for time-sensitive items</Text>
              <Text size={1}>• Use Preview button (👁️) before publishing</Text>
            </Stack>
          </Box>
          
          <Box>
            <Text size={1} weight="semibold">Using Preview:</Text>
            <Stack space={2} marginTop={2}>
              <Text size={1}>1. Add a slug to your announcement</Text>
              <Text size={1}>2. Click the Preview button (👁️) in toolbar</Text>
              <Text size={1}>3. Check how it looks on the website</Text>
              <Text size={1}>4. Make changes and refresh to see updates</Text>
              <Text size={1}>5. Click "Exit Preview" when done</Text>
            </Stack>
          </Box>
        </Stack>
        
        <Box>
          <Text size={0} muted>
            For detailed instructions, see ANNOUNCEMENT_MANAGEMENT_GUIDE.md
          </Text>
        </Box>
      </Stack>
    </Card>
  );
}
