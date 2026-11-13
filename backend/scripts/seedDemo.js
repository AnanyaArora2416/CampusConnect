const bcrypt = require('bcryptjs'),
  User = require('../models/User'),
  Assignment = require('../models/Assignment'),
  Event = require('../models/Event');
async function seedDemo() {
  const password = await bcrypt.hash('CampusDemo2026!', 12),
    accounts = {};
  for (const role of ['student', 'teacher', 'admin'])
    accounts[role] = await User.create({
      name:
        role === 'student'
          ? 'Alex Morgan'
          : role === 'teacher'
            ? 'Dr. Mira Sharma'
            : 'Campus Administrator',
      email: `${role}@campus.local`,
      role,
      password,
    });
  const day = (n) => new Date(Date.now() + n * 86400000);
  await Assignment.create([
    {
      title: 'Design a connected campus database',
      subject: 'Database Management Systems',
      description:
        'Model a connected campus. Design an ER diagram, normalize the relations, and implement meaningful database constraints. Explain your decisions.',
      dueDate: day(3),
      maxMarks: 30,
      status: 'published',
      createdBy: accounts.teacher._id,
      requirements: [
        {
          title: 'Entity relationship diagram',
          description: 'Include entities, cardinality and participation constraints.',
        },
        {
          title: 'Normalization and queries',
          description: 'Normalize to 3NF and write five useful SQL queries.',
        },
      ],
    },
    {
      title: 'A responsive campus experience',
      subject: 'Web Technologies',
      description:
        'Build an accessible responsive campus interface using HTML, CSS and JavaScript. Submit your source and explain your design.',
      dueDate: day(7),
      maxMarks: 50,
      status: 'published',
      createdBy: accounts.teacher._id,
    },
    {
      title: 'Search strategies in practice',
      subject: 'Artificial Intelligence',
      description: 'Compare two search strategies for campus navigation.',
      dueDate: day(10),
      maxMarks: 20,
      status: 'draft',
      createdBy: accounts.teacher._id,
    },
  ]);
  await Event.create([
    {
      title: 'Build something that matters',
      description:
        'A day of ideas, experiments and friendly collaboration. Turn a campus problem into a working prototype.',
      category: 'Technology',
      location: 'Innovation Lab · Block A',
      startsAt: day(5),
      endsAt: new Date(day(5).getTime() + 6 * 3600000),
      capacity: 80,
      status: 'published',
      createdBy: accounts.teacher._id,
    },
    {
      title: 'Your first machine learning model',
      description:
        'Bring your curiosity and laptop for a practical introduction to training and evaluating a model.',
      category: 'Workshop',
      location: 'Computer Lab 2',
      startsAt: day(8),
      endsAt: new Date(day(8).getTime() + 3 * 3600000),
      capacity: 40,
      status: 'published',
      createdBy: accounts.teacher._id,
    },
    {
      title: 'The campus creative evening',
      description:
        'Music, stories and the people who make campus special. Celebrate your community.',
      category: 'Cultural',
      location: 'Open Air Theatre',
      startsAt: day(12),
      endsAt: new Date(day(12).getTime() + 3 * 3600000),
      capacity: 250,
      status: 'published',
      createdBy: accounts.admin._id,
    },
  ]);
  return accounts;
}
module.exports = { seedDemo };
