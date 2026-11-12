#define _GNU_SOURCE
#include <errno.h>
#include <fcntl.h>
#include <signal.h>
#include <stdio.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <unistd.h>

static volatile sig_atomic_t release_child;

static void release(int signal_number) {
  (void)signal_number;
  release_child = 1;
}

int main(int argc, char **argv) {
  if (argc != 2) return 64;
  signal(SIGTERM, release);
  signal(SIGINT, release);
  signal(SIGCHLD, SIG_DFL);
  pid_t child = fork();
  if (child < 0) return 70;
  if (child == 0) {
    int sink = open("/dev/null", O_WRONLY);
    if (sink >= 0) {
      dup2(sink, STDOUT_FILENO);
      dup2(sink, STDERR_FILENO);
      close(sink);
    }
    execl("/system/bin/screenrecord", "screenrecord", "--time-limit", "2",
          "--bit-rate", "1000000", argv[1], (char *)NULL);
    _exit(127);
  }
  printf("{\"parent\":%d,\"child\":%d}\n", getpid(), child);
  fflush(stdout);
  int reported = 0;
  for (int tick = 0; tick < 1200 && !release_child; tick++) {
    siginfo_t outcome = {0};
    if (!reported && waitid(P_PID, (id_t)child, &outcome,
                            WEXITED | WNOHANG | WNOWAIT) == 0 &&
        outcome.si_pid == child) {
      printf("{\"exited\":true,\"code\":%d,\"status\":%d}\n",
             outcome.si_code, outcome.si_status);
      fflush(stdout);
      reported = 1;
    }
    usleep(100000);
  }
  // The unreaped child cannot have its PID reused; cleanup only signals this owned child.
  kill(child, SIGINT);
  usleep(100000);
  kill(child, SIGKILL);
  while (waitpid(child, NULL, 0) < 0 && errno == EINTR) {}
  return 0;
}
