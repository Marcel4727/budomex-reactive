package com.pbs.BudomexWebApp.config;

import com.pbs.BudomexWebApp.entity.OrderStatus;
import com.pbs.BudomexWebApp.entity.ProductType;
import com.pbs.BudomexWebApp.entity.UserRole;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.data.convert.ReadingConverter;
import org.springframework.data.convert.WritingConverter;
import org.springframework.data.r2dbc.convert.R2dbcCustomConversions;
import org.springframework.data.r2dbc.dialect.R2dbcDialect;
import io.r2dbc.spi.ConnectionFactory;
import org.springframework.data.r2dbc.dialect.DialectResolver;
import org.springframework.r2dbc.connection.init.ConnectionFactoryInitializer;
import org.springframework.r2dbc.connection.init.ResourceDatabasePopulator;
import org.springframework.core.io.ClassPathResource;
import io.r2dbc.spi.ConnectionFactory;
import org.springframework.context.annotation.Bean;


import java.util.List;

/**
 * Rejestruje konwertery enum <-> VARCHAR dla R2DBC.
 *
 * Sterowniki R2DBC (H2, PostgreSQL) nie mapuja automatycznie javowych enumow
 * tak jak Hibernate (@Enumerated(EnumType.STRING)), wiec robimy to recznie.
 * Konwertery musza byc konkretnymi (nie generycznymi) klasami, aby Spring
 * poprawnie rozpoznal parę typow source/target przez refleksje.
 */
@Configuration
public class R2dbcConfig {

    @Bean
    public R2dbcCustomConversions r2dbcCustomConversions(ConnectionFactory connectionFactory) {
        // Dynamiczne rozwiązanie dialektu (w Twoim przypadku wykryje H2)
        R2dbcDialect dialect = DialectResolver.getDialect(connectionFactory);

        return R2dbcCustomConversions.of(dialect, List.of(
                new OrderStatusToStringConverter(), new StringToOrderStatusConverter(),
                new ProductTypeToStringConverter(), new StringToProductTypeConverter(),
                new UserRoleToStringConverter(), new StringToUserRoleConverter()
        ));
    }
    @Bean
    public ConnectionFactoryInitializer initializer(ConnectionFactory connectionFactory) {
        ConnectionFactoryInitializer initializer = new ConnectionFactoryInitializer();
        initializer.setConnectionFactory(connectionFactory);
        // Wskazanie bezpośrednio na plik schema.sql leżący w src/main/resources
        initializer.setDatabasePopulator(new ResourceDatabasePopulator(new ClassPathResource("schema.sql")));
        return initializer;
    }
    // ===== OrderStatus =====

    @WritingConverter
    static class OrderStatusToStringConverter implements Converter<OrderStatus, String> {
        @Override
        public String convert(OrderStatus source) {
            return source.name();
        }
    }

    @ReadingConverter
    static class StringToOrderStatusConverter implements Converter<String, OrderStatus> {
        @Override
        public OrderStatus convert(String source) {
            return OrderStatus.valueOf(source);
        }
    }

    // ===== ProductType =====

    @WritingConverter
    static class ProductTypeToStringConverter implements Converter<ProductType, String> {
        @Override
        public String convert(ProductType source) {
            return source.name();
        }
    }

    @ReadingConverter
    static class StringToProductTypeConverter implements Converter<String, ProductType> {
        @Override
        public ProductType convert(String source) {
            return ProductType.valueOf(source);
        }
    }

    // ===== UserRole =====

    @WritingConverter
    static class UserRoleToStringConverter implements Converter<UserRole, String> {
        @Override
        public String convert(UserRole source) {
            return source.name();
        }
    }

    @ReadingConverter
    static class StringToUserRoleConverter implements Converter<String, UserRole> {
        @Override
        public UserRole convert(String source) {
            return UserRole.valueOf(source);
        }
    }
}
