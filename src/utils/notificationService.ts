import { supabase } from '../lib/supabase';

export interface CreateNotificationParams {
  employeeId: string;
  title: string;
  message: string;
  type: 'task' | 'performance_review' | 'payroll' | 'general';
  relatedId?: string;
  organizationId: string;
}

/**
 * Create a notification for an employee
 */
export async function createNotification(params: CreateNotificationParams) {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        employee_id: params.employeeId,
        title: params.title,
        message: params.message,
        type: params.type,
        related_id: params.relatedId,
        organization_id: params.organizationId,
        is_read: false,
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Error creating notification:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error creating notification:', error);
    return { success: false, error };
  }
}

/**
 * Create notifications for task assignment
 */
export async function notifyTaskAssignment(
  employeeId: string,
  taskTitle: string,
  taskId: string,
  organizationId: string
) {
  return createNotification({
    employeeId,
    title: 'New Task Assigned',
    message: `You have been assigned a new task: "${taskTitle}"`,
    type: 'task',
    relatedId: taskId,
    organizationId,
  });
}

/**
 * Create notifications for performance review assignment
 */
export async function notifyPerformanceReview(
  employeeId: string,
  reviewPeriod: string,
  reviewId: string,
  organizationId: string
) {
  return createNotification({
    employeeId,
    title: 'Performance Review Created',
    message: `A performance review has been created for you for the period: ${reviewPeriod}`,
    type: 'performance_review',
    relatedId: reviewId,
    organizationId,
  });
}

/**
 * Create notifications for payroll processing
 */
export async function notifyPayrollProcessed(
  employeeId: string,
  month: string,
  year: number,
  netSalary: number,
  organizationId: string,
  payrollId: string
) {
  return createNotification({
    employeeId,
    title: 'Payroll Processed',
    message: `Your salary for ${month} ${year} has been processed. Net Pay: ${netSalary.toLocaleString()}`,
    type: 'payroll',
    relatedId: payrollId,
    organizationId,
  });
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: string) {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification as read:', error);
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return { success: false, error };
  }
}

/**
 * Mark all notifications as read for an employee
 */
export async function markAllNotificationsAsRead(employeeId: string) {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('employee_id', employeeId)
      .eq('is_read', false);

    if (error) {
      console.error('Error marking all notifications as read:', error);
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return { success: false, error };
  }
}

