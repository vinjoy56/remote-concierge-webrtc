const bcrypt = require('bcryptjs');

const users = [
    {
        username: 'admin',
        password: 'Admin2024!',
        role: 'admin',
        name: 'Administrador Sistema',
        email: 'admin@edificio.com'
    },
    {
        username: 'comite1',
        password: 'Comite2024!',
        role: 'committee',
        name: 'Juan Pérez (Presidente)',
        email: 'jperez@edificio.com'
    },
    {
        username: 'comite2',
        password: 'Comite2024!',
        role: 'committee',
        name: 'María González (Tesorera)',
        email: 'mgonzalez@edificio.com'
    },
    {
        username: 'usuario1',
        password: 'User2024!',
        role: 'user',
        name: 'Carlos Ramírez',
        email: 'cramirez@edificio.com',
        unit: 'Torre A - 501'
    },
    {
        username: 'usuario2',
        password: 'User2024!',
        role: 'user',
        name: 'Ana Silva',
        email: 'asilva@edificio.com',
        unit: 'Torre B - 302'
    }
];

async function generateUsersFile() {
    const hashedUsers = [];

    for (const user of users) {
        const hashedPassword = await bcrypt.hash(user.password, 10);
        hashedUsers.push({
            ...user,
            password: hashedPassword
        });
    }

    const fs = require('fs');
    fs.writeFileSync('data/users.json', JSON.stringify({ users: hashedUsers }, null, 2));

    console.log('✅ Users file created successfully!');
    console.log('\nUser credentials (for reference):');
    users.forEach(u => {
        console.log(`  ${u.username} / ${u.password} (${u.role})`);
    });
}

generateUsersFile();
