'use client';

import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Card className="border-destructive/50 bg-destructive/5 dark:bg-destructive/10 animate-in fade-in zoom-in-95 duration-200">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <CardTitle className="text-lg">Section Loading Failed</CardTitle>
            </div>
            <CardDescription className="text-xs text-destructive/80">
              An error occurred while rendering this component.
            </CardDescription>
          </CardHeader>
          <CardContent className="py-2">
            <pre className="max-h-24 overflow-auto rounded bg-muted p-2 text-xs font-mono text-muted-foreground">
              {this.state.error?.message || 'Unknown error'}
            </pre>
          </CardContent>
          <CardFooter className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={this.handleReset}
              className="gap-2 text-xs hover:bg-destructive/10"
            >
              <RefreshCw className="h-3 w-3 animate-spin-slow" />
              Try Again
            </Button>
          </CardFooter>
        </Card>
      );
    }

    return this.props.children;
  }
}
