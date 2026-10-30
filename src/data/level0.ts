export type Level0ResourceType = 'video' | 'documentation' | 'practice' | 'article';

export interface Level0Resource { id: string; title: string; type: Level0ResourceType; provider?: string; url: string; embedUrl?: string; description: string; }
export interface Level0Submodule { id: string; title: string; description: string; estimatedMinutes: number; kind: 'theory' | 'interactive' | 'practical' | 'reflection' | 'assessment'; content: string[]; resources?: Level0Resource[]; repReward: number; }
export interface Level0Module { id: string; order: number; title: string; description: string; icon: string; estimatedMinutes: number; repReward: number; submodules: Level0Submodule[]; }

export const LEVEL_0_MODULES: Level0Module[] = [
  {
    id: 'cse-foundations', order: 1, title: 'CSE Foundations', description: 'A compact map of the major areas of Computer Science and how they connect.', icon: 'layers', estimatedMinutes: 75, repReward: 120,
    submodules: [
      { id: 'cse-map', title: 'The CSE Map', description: 'Understand the major branches of Computer Science without going too deep yet.', estimatedMinutes: 20, kind: 'interactive', content: ['Programming, algorithms, operating systems, databases, networks, security, software engineering, cloud, web, mobile, and AI are connected parts of one larger discipline.', 'Learn what each area solves and where it appears in real software products.'], resources: [{ id: 'cse-foundations-video', title: 'What is Computer Science?', type: 'video', provider: 'YouTube', url: 'https://www.youtube.com/watch?v=zOjov-2OZ0E', embedUrl: 'https://www.youtube.com/embed/zOjov-2OZ0E', description: 'A visual introduction to the broader field of computer science.' }], repReward: 20 },
      { id: 'how-software-comes-together', title: 'How Software Fits Together', description: 'Trace a simple idea from source code to a running application.', estimatedMinutes: 25, kind: 'theory', content: ['Source code becomes executable or runnable through a compiler or runtime.', 'A running application relies on the operating system for processes, memory, files, and hardware access.', 'In a web application, the browser communicates with server-side application logic through HTTP/APIs, and that application may read or write persistent data in a database.'], resources: [{ id: 'how-web-works-video', title: 'How The Web Works', type: 'video', provider: 'Learn.co / YouTube', url: 'https://www.youtube.com/watch?v=ao532DhZWiY', embedUrl: 'https://www.youtube.com/embed/ao532DhZWiY', description: 'A visual introduction to browsers, DNS, servers, requests, responses, and front-end/back-end roles.' }], repReward: 20 },
      { id: 'cse-foundations-checkpoint', title: 'Foundations Checkpoint', description: 'Prove that you can identify the role of the major CSE areas.', estimatedMinutes: 30, kind: 'assessment', content: ['Match real-world engineering problems to the CSE area that primarily solves them.', 'Explain in your own words how at least three CSE areas work together in a web application.'], repReward: 40 },
    ],
  },
  {
    id: 'git-basics', order: 2, title: 'Git & Version Control', description: 'Learn Git concepts and the workflow used to safely manage code changes.', icon: 'git-branch', estimatedMinutes: 100, repReward: 140,
    submodules: [
      { id: 'git-mental-model', title: 'Git Mental Model', description: 'Understand repositories, working trees, staging, commits, branches, and remotes.', estimatedMinutes: 25, kind: 'interactive', content: ['Git records snapshots of your project so you can understand, compare, and recover changes.', 'The working tree, staging area, local repository, and remote repository have different jobs.'], repReward: 20 },
      { id: 'git-core-workflow', title: 'The Core Git Workflow', description: 'Practice init, status, add, commit, branch, merge, pull, and push.', estimatedMinutes: 40, kind: 'practical', content: ['Initialize a repository and inspect its state.', 'Stage deliberate changes and create meaningful commits.', 'Create a branch, merge it, and understand what happens to history.'], resources: [{ id: 'git-scm', title: 'Pro Git Book', type: 'documentation', provider: 'Git', url: 'https://git-scm.com/book/en/v2', description: 'Officially maintained free reference for Git concepts and workflows.' }], repReward: 40 },
      { id: 'git-github-workflow', title: 'GitHub & Collaboration', description: 'Connect Git to GitHub, pull requests, and basic collaboration.', estimatedMinutes: 20, kind: 'theory', content: ['Understand the difference between Git and GitHub.', 'Learn how branches and pull requests support review and collaboration.'], repReward: 20 },
      { id: 'git-practical-checkpoint', title: 'Git Practical Checkpoint', description: 'Demonstrate a complete local-to-remote workflow.', estimatedMinutes: 15, kind: 'assessment', content: ['Create a repository, make at least two commits, create a branch, merge it, and record the workflow in a short reflection.'], repReward: 60 },
    ],
  },
  {
    id: 'computer-networks', order: 3, title: 'Computer Networks', description: 'Build the mental model behind the internet, requests, addresses, protocols, and packets.', icon: 'network', estimatedMinutes: 100, repReward: 140,
    submodules: [
      { id: 'network-basics', title: 'Networks, Devices & Addresses', description: 'Learn LAN, WAN, IP, MAC, ports, routers, and switches.', estimatedMinutes: 25, kind: 'interactive', content: ['A network moves data between devices using agreed protocols and addressing schemes.', 'Routers move traffic between networks, switches connect devices within networks, and ports identify services on a host.'], repReward: 20 },
      { id: 'dns-http-tcp', title: 'DNS, HTTP, TCP & HTTPS', description: 'Understand the common layers behind a modern web request.', estimatedMinutes: 30, kind: 'theory', content: ['DNS translates human-friendly hostnames into addresses.', 'HTTP defines web request and response semantics.', 'TCP provides reliable ordered transport; HTTPS adds encrypted transport through TLS.'], resources: [{ id: 'mdn-http', title: 'HTTP Overview', type: 'documentation', provider: 'MDN', url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Overview', description: 'Clear reference for HTTP requests, responses, headers, and the web request model.' }], repReward: 25 },
      { id: 'url-to-page', title: 'What Happens When You Open a URL?', description: 'Follow a request from browser to server and back.', estimatedMinutes: 25, kind: 'interactive', content: ['Trace DNS lookup, connection establishment, TLS, HTTP request, server processing, and response rendering.', 'Use an interactive request pipeline to see where latency and failures can happen.'], repReward: 25 },
      { id: 'network-checkpoint', title: 'Network Checkpoint', description: 'Explain the journey of a web request in the correct order.', estimatedMinutes: 20, kind: 'assessment', content: ['Arrange network events in order and identify the protocol or component responsible for each step.'], repReward: 50 },
    ],
  },
  {
    id: 'c-programming', order: 4, title: 'C Programming Basics', description: 'Learn the programming fundamentals that make lower-level concepts easier to understand later.', icon: 'code-2', estimatedMinutes: 110, repReward: 150,
    submodules: [
      { id: 'c-syntax-control-flow', title: 'C Syntax & Control Flow', description: 'Start with variables, types, operators, conditions, loops, and functions.', estimatedMinutes: 35, kind: 'practical', content: ['Write small C programs using primitive data types, arithmetic and logical operators.', 'Use if/else and loops to control execution.', 'Break a program into reusable functions with parameters and return values.'], repReward: 35 },
      { id: 'c-arrays-pointers', title: 'Arrays, Strings & Pointers', description: 'Get the first practical exposure to memory-oriented programming.', estimatedMinutes: 35, kind: 'interactive', content: ['Understand arrays as contiguous elements.', 'Understand strings as character sequences terminated by a null character.', 'Build the mental model of a pointer as a value that stores an address.'], repReward: 35 },
      { id: 'c-memory-functions', title: 'Functions, Memory & Compilation', description: 'Connect source code, compilation, memory, and execution.', estimatedMinutes: 20, kind: 'theory', content: ['Understand the broad purpose of the compiler, linker, stack, heap, and program memory.', 'Recognize why C is useful for developing systems thinking.'], repReward: 20 },
      { id: 'c-foundations-checkpoint', title: 'C Foundations Checkpoint', description: 'Solve small programming exercises and explain the memory model at a beginner level.', estimatedMinutes: 20, kind: 'assessment', content: ['Complete short deterministic exercises on variables, control flow, arrays, strings, and functions.'], repReward: 60 },
    ],
  },
  {
    id: 'college-study-strategy', order: 5, title: 'College Study Strategy', description: 'A senior-led blog series about studying consistently, choosing priorities, and surviving college without burning out.', icon: 'graduation-cap', estimatedMinutes: 55, repReward: 90,
    submodules: [
      { id: 'study-senior-stories', title: 'Senior Stories', description: 'Read practical lessons from seniors and alumni in blog format.', estimatedMinutes: 20, kind: 'reflection', content: ['Read first-person stories about balancing college academics, projects, coding practice, placements, and personal life.', 'Extract tactics that fit your own schedule instead of copying someone else’s routine blindly.'], repReward: 20 },
      { id: 'study-planning', title: 'Build Your Weekly System', description: 'Turn advice into a realistic weekly study and development routine.', estimatedMinutes: 20, kind: 'practical', content: ['Define weekly learning blocks, revision windows, project time, and recovery time.', 'Set a small number of measurable learning outcomes instead of filling a to-do list with busywork.'], repReward: 30 },
      { id: 'study-reflection', title: 'Your Personal Study Contract', description: 'Write a short commitment to how you will approach the next learning level.', estimatedMinutes: 15, kind: 'assessment', content: ['Write three habits you will keep, two distractions you will reduce, and one weekly review ritual.'], repReward: 40 },
    ],
  },
  {
    id: 'computer-fundamentals', order: 6, title: 'Computer Fundamentals', description: 'Build the basic mental model of hardware, operating systems, storage, memory, and execution.', icon: 'cpu', estimatedMinutes: 90, repReward: 130,
    submodules: [
      { id: 'hardware-basics', title: 'CPU, Memory & Storage', description: 'Understand the role of the CPU, RAM, cache, persistent storage, and I/O devices.', estimatedMinutes: 25, kind: 'interactive', content: ['The CPU executes instructions, memory holds working data and code, and storage preserves data across restarts.', 'Performance depends on how these components interact, not just one component in isolation.'], repReward: 20 },
      { id: 'os-basics', title: 'Operating System Basics', description: 'Understand processes, files, users, permissions, and system resources.', estimatedMinutes: 25, kind: 'theory', content: ['The operating system manages hardware resources and provides services to applications.', 'Processes, filesystems, permissions, and system calls are core abstractions for developers.'], repReward: 25 },
      { id: 'execution-cycle', title: 'From Instruction to Execution', description: 'Connect source-level code to CPU instructions at a high level.', estimatedMinutes: 20, kind: 'interactive', content: ['Follow the broad path from source code to machine instructions and CPU execution.', 'Understand why abstraction layers exist and what they hide from the programmer.'], repReward: 25 },
      { id: 'fundamentals-checkpoint', title: 'Computer Fundamentals Checkpoint', description: 'Demonstrate that you understand the core hardware/software model.', estimatedMinutes: 20, kind: 'assessment', content: ['Answer scenario-based questions about memory, storage, processes, and operating-system responsibilities.'], repReward: 60 },
    ],
  },
];

export const LEVEL_0_ID = 'level-0';
export const LEVEL_0_TITLE = 'CSE Foundations';
export const LEVEL_0_SUBTITLE = 'Mandatory foundation before specialization';
export const LEVEL_0_MODULE_COUNT = LEVEL_0_MODULES.length;
