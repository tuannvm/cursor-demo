package com.legoblocks.renderer.init;

import com.legoblocks.renderer.LegoBlocksMod;
import com.legoblocks.renderer.block.LegoBlock;
import net.minecraft.world.item.BlockItem;
import net.minecraft.world.item.CreativeModeTab;
import net.minecraft.world.item.Item;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.state.BlockBehaviour;
import net.minecraft.world.level.material.Material;
import net.minecraftforge.eventbus.api.IEventBus;
import net.minecraftforge.registries.DeferredRegister;
import net.minecraftforge.registries.ForgeRegistries;
import net.minecraftforge.registries.RegistryObject;

import java.util.function.Supplier;

public class ModBlocks {
    public static final DeferredRegister<Block> BLOCKS =
            DeferredRegister.create(ForgeRegistries.BLOCKS, LegoBlocksMod.MODID);

    public static final DeferredRegister<Item> ITEMS =
            DeferredRegister.create(ForgeRegistries.ITEMS, LegoBlocksMod.MODID);

    public static final RegistryObject<Block> LEGO_BRICK_1X1 = registerBlock("lego_brick_1x1",
            () -> new LegoBlock(BlockBehaviour.Properties.of(Material.STONE)
                    .strength(2.0f, 3.0f), LegoBlock.BrickType.BRICK_1X1));

    public static final RegistryObject<Block> LEGO_BRICK_2X2 = registerBlock("lego_brick_2x2",
            () -> new LegoBlock(BlockBehaviour.Properties.of(Material.STONE)
                    .strength(2.0f, 3.0f), LegoBlock.BrickType.BRICK_2X2));

    public static final RegistryObject<Block> LEGO_BRICK_2X4 = registerBlock("lego_brick_2x4",
            () -> new LegoBlock(BlockBehaviour.Properties.of(Material.STONE)
                    .strength(2.0f, 3.0f), LegoBlock.BrickType.BRICK_2X4));

    public static final RegistryObject<Block> LEGO_BRICK_SLOPE = registerBlock("lego_brick_slope",
            () -> new LegoBlock(BlockBehaviour.Properties.of(Material.STONE)
                    .strength(2.0f, 3.0f), LegoBlock.BrickType.SLOPE));

    public static final RegistryObject<Block> LEGO_BRICK_CORNER = registerBlock("lego_brick_corner",
            () -> new LegoBlock(BlockBehaviour.Properties.of(Material.STONE)
                    .strength(2.0f, 3.0f), LegoBlock.BrickType.CORNER));

    private static <T extends Block> RegistryObject<T> registerBlock(String name, Supplier<T> block) {
        RegistryObject<T> toReturn = BLOCKS.register(name, block);
        registerBlockItem(name, toReturn);
        return toReturn;
    }

    private static <T extends Block> RegistryObject<Item> registerBlockItem(String name, RegistryObject<T> block) {
        return ITEMS.register(name, () -> new BlockItem(block.get(),
                new Item.Properties().tab(CreativeModeTab.TAB_BUILDING_BLOCKS)));
    }

    public static void register(IEventBus eventBus) {
        BLOCKS.register(eventBus);
        ITEMS.register(eventBus);
    }
}
